use analytics::Analytics;
use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use azimuth::{AppState, Config, card, router};
use chrono::{DateTime, Utc};
use database::Db;
use http_body_util::BodyExt;
use mail::Mailer;
use serde_json::Value;
use storage::Storage;
use tower::ServiceExt;
use uuid::Uuid;

const SECRET: &str = "test-secret";

struct Fixture {
    app: Router,
    db: Db,
    key: String,
}

async fn fixture() -> Option<Fixture> {
    let database_url = std::env::var("DATABASE_URL").ok()?;

    let db = database::connect(&database_url, 4).expect("connect");
    database::migrate(&db).await.expect("migrate");

    let config = Config {
        bind: "127.0.0.1:0".parse().unwrap(),
        database_url,
        clickhouse_url: "http://127.0.0.1:8123".into(),
        clickhouse_database: "bx_team".into(),
        clickhouse_user: "default".into(),
        clickhouse_password: String::new(),
        app_url: "https://bxteam.org".into(),
        api_public_url: "https://api.bxteam.org".into(),
        trusted_origins: vec!["https://bxteam.org".into()],
        api_secret_key: SECRET.into(),
        cookie_domain: ".bxteam.org".into(),
        smtp_url: "smtp://127.0.0.1:1".into(),
        email_from: "BX Team <no-reply@bxteam.org>".into(),
        github_client_id: String::new(),
        github_client_secret: String::new(),
        discord_client_id: String::new(),
        discord_client_secret: String::new(),
        storage: storage::Config {
            endpoint: "http://127.0.0.1:1".into(),
            access_key_id: "x".into(),
            secret_access_key: "x".into(),
            builds_bucket: "builds".into(),
            error_payloads_bucket: "error-payloads".into(),
            public_url: "https://files.bxteam.org".into(),
        },
        max_upload_bytes: 1024 * 1024,
    };

    let analytics = Analytics::new(
        &config.clickhouse_url,
        &config.clickhouse_database,
        &config.clickhouse_user,
        &config.clickhouse_password,
    );
    let storage = Storage::new(&config.storage);
    let mailer = Mailer::new(&config.smtp_url, &config.email_from).expect("mailer");
    let key = format!("proj{}", Uuid::new_v4().simple());

    Some(Fixture {
        app: router(AppState::new(
            db.clone(),
            analytics,
            storage,
            mailer,
            card(),
            config,
        )),
        db,
        key,
    })
}

async fn seed(fixture: &Fixture) {
    let project = database::models::atlas::create_project(
        &fixture.db,
        &fixture.key,
        "DivineMC",
        Some("A fork"),
    )
    .await
    .expect("project");

    sqlx::query("UPDATE atlas.projects SET latest_version = '1.21.4' WHERE id = $1")
        .bind(project.id)
        .execute(&fixture.db)
        .await
        .unwrap();

    for (key, java) in [
        ("1.21.4", Some(21)),
        ("26.1", None),
        ("26.1.2", None),
        ("1.20", None),
    ] {
        database::models::atlas::create_version(&fixture.db, project.id, key, "SUPPORTED", java)
            .await
            .expect("version");
    }

    let version = database::models::atlas::version(&fixture.db, project.id, "1.21.4")
        .await
        .unwrap()
        .unwrap();

    let time: DateTime<Utc> = DateTime::from_timestamp(1_767_225_600, 0).unwrap();
    let mut tx = fixture.db.begin().await.unwrap();
    let build = database::models::atlas::insert_build(&mut tx, version.id, 142, "STABLE", time)
        .await
        .unwrap();
    database::models::atlas::insert_commits(
        &mut tx,
        build.id,
        &["abc123".into()],
        &["fix things".into()],
        &[time],
    )
    .await
    .unwrap();
    database::models::atlas::insert_download(
        &mut tx,
        build.id,
        "application",
        "divinemc-1.21.4-142.jar",
        &format!(
            "{}/versions/1.21.4/142/divinemc-1.21.4-142.jar",
            fixture.key
        ),
        52_428_800,
        "deadbeef",
    )
    .await
    .unwrap();
    tx.commit().await.unwrap();
}

async fn get(app: &Router, path: &str) -> (StatusCode, Option<String>, String) {
    let response = app
        .clone()
        .oneshot(Request::get(path).body(Body::empty()).unwrap())
        .await
        .unwrap();

    let status = response.status();
    let cache = response
        .headers()
        .get(header::CACHE_CONTROL)
        .map(|value| value.to_str().unwrap().to_owned());
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (status, cache, String::from_utf8(bytes.to_vec()).unwrap())
}

#[tokio::test]
async fn the_project_response_matches_the_old_shape_byte_for_byte() {
    let Some(fixture) = fixture().await else {
        eprintln!("DATABASE_URL not set, skipping");
        return;
    };
    seed(&fixture).await;

    let (status, cache, body) =
        get(&fixture.app, &format!("/atlas/projects/{}", fixture.key)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        cache.as_deref(),
        Some("public, max-age=300, stale-while-revalidate=60")
    );

    // Raw text, not parsed JSON: the group order is the render order of the downloads page.
    assert_eq!(
        body,
        format!(
            r#"{{"project":{{"id":"{}","name":"DivineMC","description":"A fork","latestVersion":"1.21.4"}},"version_groups":{{"26.1":["26.1.2","26.1"],"1.21":["1.21.4"],"1.20":["1.20"]}}}}"#,
            fixture.key
        )
    );
}

#[tokio::test]
async fn the_build_response_matches_the_old_shape_byte_for_byte() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed(&fixture).await;

    let (status, _, body) = get(
        &fixture.app,
        &format!(
            "/atlas/projects/{}/versions/1.21.4/builds/latest",
            fixture.key
        ),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body,
        format!(
            r#"{{"id":142,"time":"2026-01-01T00:00:00.000Z","channel":"STABLE","commits":[{{"sha":"abc123","message":"fix things","time":"2026-01-01T00:00:00.000Z"}}],"downloads":{{"application":{{"name":"divinemc-1.21.4-142.jar","checksums":{{"sha256":"deadbeef"}},"size":52428800,"url":"https://files.bxteam.org/{}/versions/1.21.4/142/divinemc-1.21.4-142.jar"}}}}}}"#,
            fixture.key
        )
    );
}

#[tokio::test]
async fn a_version_omits_java_when_it_has_no_requirement() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed(&fixture).await;

    let (_, _, with_java) = get(
        &fixture.app,
        &format!("/atlas/projects/{}/versions/1.21.4", fixture.key),
    )
    .await;
    assert_eq!(
        with_java,
        r#"{"version":{"id":"1.21.4","java":{"version":{"minimum":21}},"support":{"status":"SUPPORTED"}},"builds":[142]}"#
    );

    let (_, _, without_java) = get(
        &fixture.app,
        &format!("/atlas/projects/{}/versions/26.1", fixture.key),
    )
    .await;
    assert_eq!(
        without_java,
        r#"{"version":{"id":"26.1","support":{"status":"SUPPORTED"}},"builds":[]}"#
    );
}

#[tokio::test]
async fn a_missing_project_or_version_is_a_404() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, _, _) = get(&fixture.app, "/atlas/projects/nope").await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    seed(&fixture).await;
    let (status, _, body) = get(
        &fixture.app,
        &format!("/atlas/projects/{}/versions/9.9.9", fixture.key),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert!(
        body.contains(r#""message":"Version 9.9.9 not found""#),
        "{body}"
    );
}

#[tokio::test]
async fn publishing_requires_the_machine_secret() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed(&fixture).await;

    let unauthenticated = Request::post(format!("/atlas/projects/{}/versions/create", fixture.key))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(r#"{"key":"1.21.5"}"#))
        .unwrap();

    let response = fixture.app.clone().oneshot(unauthenticated).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let wrong_secret = Request::post(format!("/atlas/projects/{}/versions/create", fixture.key))
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::AUTHORIZATION, "Bearer nope")
        .body(Body::from(r#"{"key":"1.21.5"}"#))
        .unwrap();

    let response = fixture.app.oneshot(wrong_secret).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn a_duplicate_version_is_a_conflict_not_a_500() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed(&fixture).await;

    let create = || {
        Request::post(format!("/atlas/projects/{}/versions/create", fixture.key))
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::AUTHORIZATION, format!("Bearer {SECRET}"))
            .body(Body::from(r#"{"key":"1.21.6","javaMinVersion":21}"#))
            .unwrap()
    };

    let first = fixture.app.clone().oneshot(create()).await.unwrap();
    assert_eq!(first.status(), StatusCode::CREATED);

    let second = fixture.app.oneshot(create()).await.unwrap();
    assert_eq!(second.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn a_duplicate_project_key_is_a_conflict_not_a_500() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed(&fixture).await;

    let request = Request::post("/atlas/projects")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::AUTHORIZATION, format!("Bearer {SECRET}"))
        .body(Body::from(format!(
            r#"{{"key":"{}","name":"Duplicate"}}"#,
            fixture.key
        )))
        .unwrap();

    let response = fixture.app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn the_openapi_document_is_generated_from_the_handlers() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, _, body) = get(&fixture.app, "/openapi.json").await;
    assert_eq!(status, StatusCode::OK);

    let document: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(
        document["openapi"].as_str().unwrap_or_default().get(..3),
        Some("3.1")
    );

    let paths = document["paths"].as_object().expect("paths");
    for path in [
        "/atlas/projects",
        "/atlas/projects/{project}",
        "/atlas/projects/{project}/versions",
        "/atlas/projects/{project}/versions/create",
        "/atlas/projects/{project}/versions/{version}",
        "/atlas/projects/{project}/versions/{version}/builds",
        "/atlas/projects/{project}/versions/{version}/builds/latest",
        "/atlas/projects/{project}/versions/{version}/builds/{build}",
        "/atlas/projects/{project}/versions/{version}/builds/upload",
        "/health",
        "/",
    ] {
        assert!(
            paths.contains_key(path),
            "{path} is missing from the document"
        );
    }
}

#[tokio::test]
async fn the_browser_can_read_atlas_without_credentials() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed(&fixture).await;

    let request = Request::get(format!("/atlas/projects/{}", fixture.key))
        .header(header::ORIGIN, "https://bxteam.org")
        .body(Body::empty())
        .unwrap();

    let response = fixture.app.oneshot(request).await.unwrap();
    assert_eq!(
        response
            .headers()
            .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
            .map(|value| value.to_str().unwrap()),
        Some("*")
    );
}

#[tokio::test]
async fn a_trailing_slash_reaches_the_same_handler() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed(&fixture).await;

    let path = format!("/atlas/projects/{}/versions/1.21.4", fixture.key);
    let (status, _, body) = get(&fixture.app, &path).await;
    let (trailing_status, _, trailing_body) = get(&fixture.app, &format!("{path}/")).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(trailing_status, StatusCode::OK);
    assert_eq!(body, trailing_body);

    // Trimming must leave the root alone rather than turning it into an empty path.
    let (root, _, _) = get(&fixture.app, "/").await;
    assert_eq!(root, StatusCode::OK);
}
