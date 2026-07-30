use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use database::Db;
use http_body_util::BodyExt;
use influx::{AppState, Config, card, router};
use serde_json::Value;
use tower::ServiceExt;
use uuid::Uuid;

/// The batch the published Java SDK actually sends, byte for byte.
const SDK_BATCH: &str = include_str!("../../../packages/types/tests/fixtures/sdk_batch.json");

struct Fixture {
    app: Router,
    db: Db,
    project_id: Uuid,
    token: String,
}

async fn fixture(requests_per_minute: u32) -> Option<Fixture> {
    let database_url = std::env::var("DATABASE_URL").ok()?;

    let db = database::connect(&database_url, 4).expect("connect");
    database::migrate(&db).await.expect("migrate");

    let suffix = Uuid::new_v4().simple().to_string();
    let user = database::models::auth::create_user(
        &db,
        "Ingest Test",
        &format!("ingest-{suffix}@example.com"),
        true,
        None,
    )
    .await
    .expect("create user");

    let project = database::models::pulsify::create_project(
        &db,
        user.id,
        &format!("Server {suffix}"),
        &format!("server-{suffix}"),
        "server",
        None,
    )
    .await
    .expect("create project");

    let token = format!("tok_{suffix}");
    database::models::pulsify::create_token(&db, project.id, &token, None)
        .await
        .expect("create token");

    let config = Config {
        bind: "127.0.0.1:0".parse().unwrap(),
        database_url,
        requests_per_minute,
        max_body_bytes: 4 * 1024 * 1024,
    };

    Some(Fixture {
        app: router(AppState::new(db.clone(), config, card())),
        db,
        project_id: project.id,
        token,
    })
}

fn post(project_id: Uuid, token: &str, body: &str) -> Request<Body> {
    Request::post(format!("/api/v1/e/{project_id}"))
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::AUTHORIZATION, format!("Bearer {token}"))
        .body(Body::from(body.to_owned()))
        .unwrap()
}

async fn json_of(response: axum::response::Response) -> Value {
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

#[tokio::test]
async fn an_sdk_batch_is_accepted_and_queued() {
    let Some(fixture) = fixture(1000).await else {
        eprintln!("DATABASE_URL not set, skipping");
        return;
    };

    let response = fixture
        .app
        .clone()
        .oneshot(post(fixture.project_id, &fixture.token, SDK_BATCH))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::ACCEPTED);
    assert_eq!(
        json_of(response).await,
        serde_json::json!({ "accepted": 7 })
    );

    let queued: Vec<String> = sqlx::query_scalar(
        "SELECT payload->>'type' FROM pulsify.ingest_queue WHERE project_id = $1 ORDER BY id",
    )
    .bind(fixture.project_id)
    .fetch_all(&fixture.db)
    .await
    .unwrap();

    assert_eq!(
        queued,
        [
            "heartbeat",
            "event",
            "event",
            "error",
            "error",
            "metric",
            "metric"
        ]
    );
}

#[tokio::test]
async fn a_bare_event_is_still_a_batch() {
    let Some(fixture) = fixture(1000).await else {
        return;
    };

    let response = fixture
        .app
        .oneshot(post(
            fixture.project_id,
            &fixture.token,
            r#"{"type":"metric","timestamp":1,"name":"m","value":1}"#,
        ))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::ACCEPTED);
    assert_eq!(
        json_of(response).await,
        serde_json::json!({ "accepted": 1 })
    );
}

#[tokio::test]
async fn ping_answers_exactly_200() {
    let Some(fixture) = fixture(1000).await else {
        return;
    };

    let request = Request::get(format!("/api/v1/ping/{}", fixture.project_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", fixture.token))
        .body(Body::empty())
        .unwrap();

    let response = fixture.app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(json_of(response).await, serde_json::json!({ "ok": true }));
}

#[tokio::test]
async fn an_unknown_token_is_rejected_with_a_challenge() {
    let Some(fixture) = fixture(1000).await else {
        return;
    };

    let response = fixture
        .app
        .oneshot(post(fixture.project_id, "nope", SDK_BATCH))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(
        response
            .headers()
            .get(header::WWW_AUTHENTICATE)
            .map(|value| value.to_str().unwrap()),
        Some("Bearer")
    );
}

#[tokio::test]
async fn a_token_from_another_project_is_rejected() {
    let Some(fixture) = fixture(1000).await else {
        return;
    };

    let response = fixture
        .app
        .oneshot(post(Uuid::new_v4(), &fixture.token, SDK_BATCH))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn malformed_and_empty_bodies_are_rejected() {
    let Some(fixture) = fixture(1000).await else {
        return;
    };

    let response = fixture
        .app
        .clone()
        .oneshot(post(fixture.project_id, &fixture.token, "not json"))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let response = fixture
        .app
        .oneshot(post(fixture.project_id, &fixture.token, "[]"))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn the_rate_limit_asks_the_sdk_to_back_off_rather_than_give_up() {
    let Some(fixture) = fixture(1).await else {
        return;
    };

    let first = fixture
        .app
        .clone()
        .oneshot(post(fixture.project_id, &fixture.token, SDK_BATCH))
        .await
        .unwrap();
    assert_eq!(first.status(), StatusCode::ACCEPTED);

    let second = fixture
        .app
        .oneshot(post(fixture.project_id, &fixture.token, SDK_BATCH))
        .await
        .unwrap();

    assert_eq!(second.status(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(
        second
            .headers()
            .get(header::RETRY_AFTER)
            .map(|value| value.to_str().unwrap()),
        Some("60")
    );
}

#[tokio::test]
async fn exceeding_the_daily_quota_defers_until_the_window_resets() {
    let Some(fixture) = fixture(1000).await else {
        return;
    };

    sqlx::query(
        "INSERT INTO pulsify.quotas (user_id, max_events_per_day)
         SELECT owner_id, 3 FROM pulsify.projects WHERE id = $1
         ON CONFLICT (user_id) DO UPDATE SET max_events_per_day = 3",
    )
    .bind(fixture.project_id)
    .execute(&fixture.db)
    .await
    .unwrap();

    let response = fixture
        .app
        .oneshot(post(fixture.project_id, &fixture.token, SDK_BATCH))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
    let retry_after: u64 = response
        .headers()
        .get(header::RETRY_AFTER)
        .unwrap()
        .to_str()
        .unwrap()
        .parse()
        .unwrap();
    assert!((1..=86_400).contains(&retry_after), "{retry_after}");
}

#[tokio::test]
async fn the_service_card_reports_its_version() {
    let Some(fixture) = fixture(1000).await else {
        return;
    };

    let response = fixture
        .app
        .oneshot(Request::get("/").body(Body::empty()).unwrap())
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let card = json_of(response).await;
    assert_eq!(card["name"], "bx-team-influx");
    assert_eq!(card["version"], env!("CARGO_PKG_VERSION"));
    assert!(card["build_info"]["git_hash"].is_string());
}
