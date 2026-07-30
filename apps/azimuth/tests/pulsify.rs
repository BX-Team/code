use analytics::Analytics;
use analytics::writer::{
    Batch, ErrorPoint, EventPoint, MetricPoint, ServerStatsPoint, SessionPoint,
};
use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use azimuth::auth::session::hash_token;
use azimuth::{AppState, Config, card, router};
use chrono::{Duration, Utc};
use database::Db;
use database::models::{auth, pulsify};
use http_body_util::BodyExt;
use mail::Mailer;
use serde_json::{Value, json};
use std::collections::BTreeMap;
use storage::Storage;
use tower::ServiceExt;
use uuid::Uuid;

struct Fixture {
    app: Router,
    db: Db,
    analytics: Analytics,
    token: String,
    admin_token: String,
    user_id: Uuid,
    server_id: Uuid,
    plugin_id: Uuid,
    plugin_name: String,
}

async fn sign_in(db: &Db, user_id: Uuid) -> String {
    let token = Uuid::new_v4().to_string();
    auth::create_session(
        db,
        user_id,
        &hash_token(&token),
        Utc::now() + Duration::days(7),
        None,
        None,
    )
    .await
    .expect("session");
    token
}

async fn fixture() -> Option<Fixture> {
    let database_url = std::env::var("DATABASE_URL").ok()?;
    let clickhouse_url = std::env::var("CLICKHOUSE_TEST_URL").ok()?;
    let clickhouse_database = std::env::var("CLICKHOUSE_TEST_DATABASE")
        .unwrap_or_else(|_| format!("bx_pulsify_{}", Uuid::new_v4().simple()));

    let db = database::connect(&database_url, 8).expect("connect");
    database::migrate(&db).await.expect("migrate");

    let analytics = Analytics::new(
        &clickhouse_url,
        &clickhouse_database,
        &std::env::var("CLICKHOUSE_TEST_USER").unwrap_or_else(|_| "default".into()),
        &std::env::var("CLICKHOUSE_TEST_PASSWORD").unwrap_or_default(),
    );
    analytics.migrate().await.expect("clickhouse migrate");

    let suffix = Uuid::new_v4().simple().to_string();
    let user = auth::create_user(
        &db,
        "Owner",
        &format!("owner-{suffix}@example.com"),
        true,
        None,
    )
    .await
    .expect("user");
    let admin = auth::create_user(
        &db,
        "Admin",
        &format!("admin-{suffix}@example.com"),
        true,
        None,
    )
    .await
    .expect("admin");
    sqlx::query("UPDATE auth.users SET role = 'admin' WHERE id = $1")
        .bind(admin.id)
        .execute(&db)
        .await
        .unwrap();

    let server = pulsify::create_project(
        &db,
        user.id,
        &format!("Server {suffix}"),
        &format!("server-{suffix}"),
        "server",
        Some("My server"),
    )
    .await
    .expect("server");

    let plugin_name = format!("Plugin{suffix}");
    let plugin = pulsify::create_project(
        &db,
        user.id,
        &plugin_name,
        &format!("plugin-{suffix}"),
        "plugin",
        None,
    )
    .await
    .expect("plugin");

    let config = Config {
        bind: "127.0.0.1:0".parse().unwrap(),
        database_url,
        clickhouse_url,
        clickhouse_database,
        clickhouse_user: "default".into(),
        clickhouse_password: String::new(),
        app_url: "https://bxteam.org".into(),
        api_public_url: "https://api.bxteam.org".into(),
        trusted_origins: vec!["https://bxteam.org".into()],
        api_secret_key: "test-secret".into(),
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
        max_upload_bytes: 1024,
    };

    let storage = Storage::new(&config.storage);
    let mailer = Mailer::new(&config.smtp_url, &config.email_from).expect("mailer");

    Some(Fixture {
        app: router(AppState::new(
            db.clone(),
            analytics.clone(),
            storage,
            mailer,
            card(),
            config,
        )),
        token: sign_in(&db, user.id).await,
        admin_token: sign_in(&db, admin.id).await,
        analytics,
        db,
        user_id: user.id,
        server_id: server.id,
        plugin_id: plugin.id,
        plugin_name,
    })
}

async fn call(app: &Router, request: Request<Body>) -> (StatusCode, Value) {
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let body = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).unwrap_or(Value::Null)
    };
    (status, body)
}

fn authed(method: &str, path: &str, token: &str, body: Option<Value>) -> Request<Body> {
    let builder = Request::builder()
        .method(method)
        .uri(path)
        .header(header::COOKIE, format!("bx_session={token}"))
        .header(header::CONTENT_TYPE, "application/json");

    match body {
        Some(body) => builder.body(Body::from(body.to_string())).unwrap(),
        None => builder.body(Body::empty()).unwrap(),
    }
}

fn get(path: &str, token: &str) -> Request<Body> {
    authed("GET", path, token, None)
}

async fn seed_analytics(fixture: &Fixture) {
    let mut tx = fixture.db.begin().await.unwrap();
    pulsify::upsert_server_metadata(&mut tx, fixture.server_id, "DivineMC", "1.21.4", "SE")
        .await
        .unwrap();
    tx.commit().await.unwrap();

    let now = Utc::now();
    let player = Uuid::new_v4();
    let mut batch = Batch::default();

    batch.events.push(EventPoint {
        timestamp: now,
        project_id: fixture.server_id,
        kind: "heartbeat".into(),
        payload: "{}".into(),
    });
    batch.server_stats.push(ServerStatsPoint {
        timestamp: now,
        project_id: fixture.server_id,
        online: 42,
        tps: 19.8,
        mspt: 12.4,
        memory_used_mb: 4096,
        memory_max_mb: 8192,
    });
    batch.sessions.push(SessionPoint {
        timestamp: now,
        project_id: fixture.server_id,
        player_uuid: player,
        client_version: "1.21.4".into(),
        country_code: "SE".into(),
        abandoned: 0,
        duration_seconds: 600,
    });
    batch.errors.push(ErrorPoint {
        timestamp: now,
        project_id: fixture.server_id,
        fingerprint: "fp1".into(),
        plugin: fixture.plugin_name.clone(),
        level: "error".into(),
        server_version: "1.21.4".into(),
        server_software: "DivineMC".into(),
        plugin_version: "1.4.2".into(),
        message: "boom".into(),
    });
    batch.metrics.push(MetricPoint {
        timestamp: now,
        project_id: fixture.server_id,
        name: "economy.balance.total".into(),
        labels: BTreeMap::from([("world".to_string(), "overworld".to_string())]),
        value: 1234.0,
    });

    fixture.analytics.write(&batch).await.expect("write");
}

#[tokio::test]
async fn every_endpoint_refuses_an_anonymous_caller() {
    let Some(fixture) = fixture().await else {
        eprintln!("DATABASE_URL or CLICKHOUSE_TEST_URL not set, skipping");
        return;
    };

    for path in [
        "/pulsify/overview",
        "/pulsify/billing",
        "/pulsify/projects",
        &format!("/pulsify/projects/{}/stats", fixture.server_id),
        &format!("/pulsify/projects/{}/errors", fixture.server_id),
        &format!("/pulsify/projects/{}/tokens", fixture.server_id),
        &format!("/pulsify/projects/{}/alerts", fixture.server_id),
    ] {
        let request = Request::get(path).body(Body::empty()).unwrap();
        let (status, _) = call(&fixture.app, request).await;
        assert_eq!(
            status,
            StatusCode::UNAUTHORIZED,
            "{path} allowed an anonymous caller"
        );
    }
}

#[tokio::test]
async fn another_users_project_looks_like_it_does_not_exist() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let stranger = auth::create_user(
        &fixture.db,
        "Stranger",
        &format!("stranger-{}@example.com", Uuid::new_v4().simple()),
        true,
        None,
    )
    .await
    .unwrap();
    let stranger_token = sign_in(&fixture.db, stranger.id).await;

    // 404 and not 403: a wrong owner must not learn that the id exists.
    let (status, _) = call(
        &fixture.app,
        get(
            &format!("/pulsify/projects/{}/stats", fixture.server_id),
            &stranger_token,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn the_project_list_matches_what_the_dashboard_expects() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed_analytics(&fixture).await;

    let (status, body) = call(&fixture.app, get("/pulsify/projects", &fixture.token)).await;
    assert_eq!(status, StatusCode::OK);

    let projects = body.as_array().expect("array");
    let server = projects
        .iter()
        .find(|project| project["id"] == fixture.server_id.to_string())
        .expect("server project");

    for field in [
        "id",
        "name",
        "slug",
        "type",
        "description",
        "createdAt",
        "lastSeenAt",
        "errors",
    ] {
        assert!(server.get(field).is_some(), "{field} is missing");
    }
    assert_eq!(server["type"], "server");
    assert_eq!(server["errors"], 1);
}

#[tokio::test]
async fn a_suppressed_issue_stops_counting_towards_the_error_total() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed_analytics(&fixture).await;

    let (_, before) = call(&fixture.app, get("/pulsify/overview", &fixture.token)).await;
    assert_eq!(before["summary"]["totalErrors"], 1);

    pulsify::set_issue_status(
        &fixture.db,
        fixture.server_id,
        "fp1",
        "resolved",
        Some("1.4.2"),
        None,
        None,
    )
    .await
    .unwrap();

    let (_, after) = call(&fixture.app, get("/pulsify/overview", &fixture.token)).await;
    assert_eq!(after["summary"]["totalErrors"], 0);
}

#[tokio::test]
async fn the_overview_carries_every_summary_field() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed_analytics(&fixture).await;

    let (status, body) = call(
        &fixture.app,
        get("/pulsify/overview?range=7d", &fixture.token),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["range"], "7d");

    for field in [
        "projects",
        "servers",
        "plugins",
        "mods",
        "totalErrors",
        "totalEvents24h",
        "peakOnline24h",
        "uniquePlayers24h",
    ] {
        assert!(body["summary"].get(field).is_some(), "{field} is missing");
    }
    assert_eq!(body["summary"]["servers"], 1);
    assert_eq!(body["summary"]["plugins"], 1);
    assert_eq!(body["summary"]["peakOnline24h"], 42);

    let project = body["projects"]
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["id"] == fixture.server_id.to_string())
        .unwrap();
    assert_eq!(project["software"], "DivineMC");
}

#[tokio::test]
async fn the_stats_page_gets_memory_and_mspt_too() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed_analytics(&fixture).await;

    let (status, body) = call(
        &fixture.app,
        get(
            &format!("/pulsify/projects/{}/stats", fixture.server_id),
            &fixture.token,
        ),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["summary"]["totalErrors"], 1);
    assert_eq!(body["metadata"]["software"], "DivineMC");

    let point = &body["timeseries"][0];
    for field in ["time", "online", "tps", "mspt", "memory_used", "memory_max"] {
        assert!(point.get(field).is_some(), "{field} is missing");
    }
    assert_eq!(point["memory_max"], 8192.0);
}

#[tokio::test]
async fn a_session_reports_when_the_player_joined_not_when_they_left() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed_analytics(&fixture).await;

    let (status, body) = call(
        &fixture.app,
        get(
            &format!("/pulsify/projects/{}/players", fixture.server_id),
            &fixture.token,
        ),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let session = &body["sessions"][0];
    assert_eq!(session["client_version"], "1.21.4");
    assert_eq!(session["country_code"], "SE");

    // The row is written on quit, so joined_at is the end minus the duration.
    let joined: chrono::DateTime<Utc> = session["joined_at"].as_str().unwrap().parse().unwrap();
    assert!((Utc::now() - joined).num_seconds() >= 600);
}

#[tokio::test]
async fn the_error_list_folds_the_issue_registry_into_the_analytics_rows() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed_analytics(&fixture).await;

    let path = format!("/pulsify/projects/{}/errors", fixture.server_id);
    let (status, body) = call(&fixture.app, get(&path, &fixture.token)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["errors"][0]["status"], "open");
    assert_eq!(body["errors"][0]["stacktrace"], "");
    assert_eq!(body["counts"]["unresolved"], 1);
    assert_eq!(body["status"], "unresolved");

    let (status, _) = call(
        &fixture.app,
        authed(
            "POST",
            &format!("/pulsify/projects/{}/errors/status", fixture.server_id),
            &fixture.token,
            Some(json!({ "fingerprint": "fp1", "action": "resolve" })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    let (_, filtered) = call(&fixture.app, get(&path, &fixture.token)).await;
    assert_eq!(filtered["errors"].as_array().unwrap().len(), 0);
    assert_eq!(filtered["counts"]["resolved"], 1);

    let (_, all) = call(
        &fixture.app,
        get(&format!("{path}?status=all"), &fixture.token),
    )
    .await;
    assert_eq!(all["errors"][0]["status"], "resolved");
}

#[tokio::test]
async fn an_expired_mute_reads_as_open_without_waiting_for_the_next_error() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed_analytics(&fixture).await;

    pulsify::set_issue_status(
        &fixture.db,
        fixture.server_id,
        "fp1",
        "muted",
        None,
        Some(Utc::now() - Duration::hours(1)),
        None,
    )
    .await
    .unwrap();

    let (_, body) = call(
        &fixture.app,
        get(
            &format!("/pulsify/projects/{}/errors?status=all", fixture.server_id),
            &fixture.token,
        ),
    )
    .await;

    assert_eq!(body["errors"][0]["status"], "open");
    assert_eq!(body["errors"][0]["mutedUntil"], Value::Null);
}

#[tokio::test]
async fn cross_server_errors_stay_shut_until_an_admin_verifies_the_project() {
    let Some(fixture) = fixture().await else {
        return;
    };
    seed_analytics(&fixture).await;

    let mut tx = fixture.db.begin().await.unwrap();
    pulsify::upsert_installations(
        &mut tx,
        fixture.server_id,
        std::slice::from_ref(&fixture.plugin_name),
        &["1.4.2".into()],
        &[true],
    )
    .await
    .unwrap();
    tx.commit().await.unwrap();

    let path = format!("/pulsify/projects/{}/cross-errors", fixture.plugin_id);
    let (status, body) = call(&fixture.app, get(&path, &fixture.token)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["verified"], false);
    assert_eq!(body["errors"].as_array().unwrap().len(), 0);
    assert_eq!(body["sharingServers"], 1);

    let (status, _) = call(
        &fixture.app,
        authed(
            "PATCH",
            &format!("/pulsify/projects/{}/verify", fixture.plugin_id),
            &fixture.token,
            Some(json!({ "verified": true })),
        ),
    )
    .await;
    assert_eq!(
        status,
        StatusCode::FORBIDDEN,
        "a plain owner must not verify"
    );

    let (status, _) = call(
        &fixture.app,
        authed(
            "PATCH",
            &format!("/pulsify/projects/{}/verify", fixture.plugin_id),
            &fixture.admin_token,
            Some(json!({ "verified": true })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let (_, body) = call(&fixture.app, get(&path, &fixture.token)).await;
    assert_eq!(body["verified"], true);
    assert_eq!(body["errors"][0]["serverCount"], 1);
}

#[tokio::test]
async fn a_server_owner_can_stop_sharing_a_plugins_errors() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let mut tx = fixture.db.begin().await.unwrap();
    pulsify::upsert_installations(
        &mut tx,
        fixture.server_id,
        std::slice::from_ref(&fixture.plugin_name),
        &["1.4.2".into()],
        &[true],
    )
    .await
    .unwrap();
    tx.commit().await.unwrap();

    let (status, body) = call(
        &fixture.app,
        get(
            &format!("/pulsify/projects/{}/installations", fixture.server_id),
            &fixture.token,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["installations"][0]["shareErrors"], true);

    let (status, _) = call(
        &fixture.app,
        authed(
            "PATCH",
            &format!(
                "/pulsify/projects/{}/installations/{}",
                fixture.server_id, fixture.plugin_id
            ),
            &fixture.token,
            Some(json!({ "shareErrors": false })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    assert!(
        pulsify::sharing_servers(&fixture.db, fixture.plugin_id)
            .await
            .unwrap()
            .is_empty()
    );
}

#[tokio::test]
async fn metrics_break_down_by_every_label() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let mut batch = Batch::default();
    batch.metrics.push(MetricPoint {
        timestamp: Utc::now(),
        project_id: fixture.plugin_id,
        name: "economy.balance.total".into(),
        labels: BTreeMap::from([
            ("world".to_string(), "overworld".to_string()),
            ("currency".to_string(), "coins".to_string()),
            ("tier".to_string(), "gold".to_string()),
            ("extra".to_string(), "yes".to_string()),
        ]),
        value: 1234.0,
    });
    fixture.analytics.write(&batch).await.unwrap();

    let (status, body) = call(
        &fixture.app,
        get(
            &format!("/pulsify/projects/{}/metrics", fixture.plugin_id),
            &fixture.token,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["metrics"][0]["name"], "economy.balance.total");
    assert_eq!(body["metrics"][0]["totalPoints"], 1);

    let (status, body) = call(
        &fixture.app,
        get(
            &format!(
                "/pulsify/projects/{}/metrics/economy.balance.total",
                fixture.plugin_id
            ),
            &fixture.token,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let keys: Vec<&str> = body["labels"]
        .as_array()
        .unwrap()
        .iter()
        .map(|entry| entry["key"].as_str().unwrap())
        .collect();
    assert_eq!(keys, ["currency", "extra", "tier", "world"]);
    assert_eq!(body["series"][0]["count"], 1);
}

#[tokio::test]
async fn a_metric_list_is_meaningless_for_a_server_project() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, _) = call(
        &fixture.app,
        get(
            &format!("/pulsify/projects/{}/metrics", fixture.server_id),
            &fixture.token,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn a_token_key_is_shown_once_and_never_again() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, created) = call(
        &fixture.app,
        authed(
            "POST",
            &format!("/pulsify/projects/{}/tokens", fixture.server_id),
            &fixture.token,
            Some(json!({ "label": "CI" })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    let key = created["key"].as_str().expect("key").to_owned();
    assert_eq!(key.len(), 64);

    let (_, listed) = call(
        &fixture.app,
        get(
            &format!("/pulsify/projects/{}/tokens", fixture.server_id),
            &fixture.token,
        ),
    )
    .await;
    assert!(
        listed[0].get("key").is_none(),
        "the list must not carry keys"
    );
    assert_eq!(listed[0]["label"], "CI");

    let id = created["id"].as_str().unwrap();
    let (status, _) = call(
        &fixture.app,
        authed(
            "DELETE",
            &format!("/pulsify/projects/{}/tokens/{id}", fixture.server_id),
            &fixture.token,
            None,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // Revoked, not deleted: a token's ingest history stays attributable.
    assert!(
        pulsify::authenticate_token(&fixture.db, &key)
            .await
            .unwrap()
            .is_none()
    );
}

#[tokio::test]
async fn alert_rules_are_validated_before_they_are_stored() {
    let Some(fixture) = fixture().await else {
        return;
    };
    let path = format!("/pulsify/projects/{}/alerts", fixture.server_id);

    for body in [
        json!({ "type": "nonsense", "webhookUrl": "https://example.com/h" }),
        json!({ "type": "new_issue", "webhookUrl": "http://example.com/h" }),
        json!({ "type": "new_issue", "webhookUrl": "https://127.0.0.1/h" }),
        json!({ "type": "new_issue", "webhookUrl": "https://example.com/h", "threshold": 0 }),
        json!({ "type": "new_issue", "webhookUrl": "https://example.com/h", "windowMinutes": 5000 }),
    ] {
        let (status, _) = call(
            &fixture.app,
            authed("POST", &path, &fixture.token, Some(body.clone())),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{body} was accepted");
    }

    let (status, created) = call(
        &fixture.app,
        authed(
            "POST",
            &path,
            &fixture.token,
            Some(json!({ "type": "error_spike", "webhookUrl": "https://example.com/hook", "threshold": 50 })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(created["threshold"], 50);
    assert_eq!(created["windowMinutes"], 5);

    let id = created["id"].as_str().unwrap();
    let (status, updated) = call(
        &fixture.app,
        authed(
            "PATCH",
            &format!("{path}/{id}"),
            &fixture.token,
            Some(json!({ "enabled": false })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["enabled"], false);

    let (status, _) = call(
        &fixture.app,
        authed("DELETE", &format!("{path}/{id}"), &fixture.token, None),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);
}

#[tokio::test]
async fn creating_a_project_enforces_the_quota_and_the_shape_of_a_slug() {
    let Some(fixture) = fixture().await else {
        return;
    };

    for body in [
        json!({ "name": "Bad", "slug": "Has Spaces", "type": "server" }),
        json!({ "name": "Bad", "slug": "UPPER", "type": "server" }),
        json!({ "name": "", "slug": "ok", "type": "server" }),
        json!({ "name": "Bad", "slug": "ok", "type": "spaceship" }),
    ] {
        let (status, _) = call(
            &fixture.app,
            authed(
                "POST",
                "/pulsify/projects",
                &fixture.token,
                Some(body.clone()),
            ),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{body} was accepted");
    }

    // A duplicate slug used to be a 500.
    let taken = pulsify::projects_of(&fixture.db, fixture.user_id)
        .await
        .unwrap();
    let (status, _) = call(
        &fixture.app,
        authed(
            "POST",
            "/pulsify/projects",
            &fixture.token,
            Some(json!({ "name": "Other", "slug": taken[0].slug, "type": "server" })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::CONFLICT);

    sqlx::query(
        "INSERT INTO pulsify.quotas (user_id, max_projects) VALUES ($1, 2)
         ON CONFLICT (user_id) DO UPDATE SET max_projects = 2",
    )
    .bind(fixture.user_id)
    .execute(&fixture.db)
    .await
    .unwrap();

    let (status, _) = call(
        &fixture.app,
        authed(
            "POST",
            "/pulsify/projects",
            &fixture.token,
            Some(json!({ "name": "Third", "slug": format!("third-{}", Uuid::new_v4().simple()), "type": "server" })),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn only_an_admin_may_read_someone_elses_projects() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, _) = call(
        &fixture.app,
        get(
            &format!("/pulsify/projects?owner={}", fixture.user_id),
            &fixture.admin_token,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let stranger = auth::create_user(
        &fixture.db,
        "Nosy",
        &format!("nosy-{}@example.com", Uuid::new_v4().simple()),
        true,
        None,
    )
    .await
    .unwrap();
    let stranger_token = sign_in(&fixture.db, stranger.id).await;

    let (status, _) = call(
        &fixture.app,
        get(
            &format!("/pulsify/projects?owner={}", fixture.user_id),
            &stranger_token,
        ),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn a_banned_user_cannot_use_their_session() {
    let Some(fixture) = fixture().await else {
        return;
    };

    auth::set_ban(&fixture.db, fixture.user_id, true, Some("spam"), None)
        .await
        .unwrap();

    let (status, body) = call(&fixture.app, get("/pulsify/projects", &fixture.token)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(body["message"], "spam");
}

#[tokio::test]
async fn the_dashboard_origin_is_allowed_to_send_credentials() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let request = Request::get("/pulsify/projects")
        .header(header::ORIGIN, "https://bxteam.org")
        .header(header::COOKIE, format!("bx_session={}", fixture.token))
        .body(Body::empty())
        .unwrap();

    let response = fixture.app.clone().oneshot(request).await.unwrap();
    let headers = response.headers();
    assert_eq!(
        headers
            .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
            .map(|value| value.to_str().unwrap()),
        Some("https://bxteam.org")
    );
    assert_eq!(
        headers
            .get(header::ACCESS_CONTROL_ALLOW_CREDENTIALS)
            .map(|value| value.to_str().unwrap()),
        Some("true")
    );
}

#[tokio::test]
async fn billing_reports_the_quota_that_ingest_actually_enforces() {
    let Some(fixture) = fixture().await else {
        return;
    };

    let (status, body) = call(&fixture.app, get("/pulsify/billing", &fixture.token)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["plan"], "free");
    assert!(body["limits"]["maxEventsPerDay"].as_i64().unwrap() > 0);
    assert!(body["usage"]["projects"].as_i64().unwrap() >= 2);
}
