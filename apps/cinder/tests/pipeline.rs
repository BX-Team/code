use analytics::Analytics;
use chrono::Utc;
use cinder::{AppState, Config, consumer};
use database::Db;
use database::models::{auth, pulsify};
use serde_json::{Value, json};
use storage::Storage;
use tokio::sync::Mutex;
use uuid::Uuid;

/// The consumer drains the whole queue by design, so these tests cannot overlap.
static QUEUE: Mutex<()> = Mutex::const_new(());

struct Fixture {
    state: AppState,
    db: Db,
    analytics: Analytics,
    server_id: Uuid,
    plugin_id: Uuid,
    plugin_name: String,
}

async fn fixture() -> Option<Fixture> {
    let database_url = std::env::var("DATABASE_URL").ok()?;
    let clickhouse_url = std::env::var("CLICKHOUSE_TEST_URL").ok()?;
    let clickhouse_database = std::env::var("CLICKHOUSE_TEST_DATABASE")
        .unwrap_or_else(|_| format!("bx_pipeline_{}", Uuid::new_v4().simple()));

    let db = database::connect(&database_url, 4).expect("connect");
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
        "Pipeline",
        &format!("p-{suffix}@example.com"),
        true,
        None,
    )
    .await
    .expect("user");

    let server = pulsify::create_project(
        &db,
        user.id,
        &format!("Server {suffix}"),
        &format!("server-{suffix}"),
        "server",
        None,
    )
    .await
    .expect("server project");

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
    .expect("plugin project");

    let config = Config {
        database_url,
        clickhouse_url,
        clickhouse_database,
        clickhouse_user: "default".into(),
        clickhouse_password: String::new(),
        app_url: "https://bxteam.org".into(),
        ipinfo_mmdb_path: None,
        storage: storage::Config {
            endpoint: "http://127.0.0.1:1".into(),
            access_key_id: "x".into(),
            secret_access_key: "x".into(),
            builds_bucket: "builds".into(),
            error_payloads_bucket: "error-payloads".into(),
            public_url: "https://files.bxteam.org".into(),
        },
        batch_size: 100,
        idle_sleep_ms: 10,
        usage_retention_days: 90,
    };

    let storage = Storage::new(&config.storage);
    let state = AppState::new(db.clone(), analytics.clone(), storage, config);

    Some(Fixture {
        state,
        db,
        analytics,
        server_id: server.id,
        plugin_id: plugin.id,
        plugin_name,
    })
}

async fn enqueue(db: &Db, project_id: Uuid, events: &[Value]) {
    database::queue::enqueue(db, project_id, events, Utc::now(), Some("203.0.113.7"))
        .await
        .expect("enqueue");
}

async fn count(analytics: &Analytics, table: &str, project_id: Uuid) -> u64 {
    analytics
        .client()
        .query(&format!("SELECT count() FROM {table} WHERE project_id = ?"))
        .bind(project_id)
        .fetch_one::<u64>()
        .await
        .expect("count")
}

#[tokio::test]
async fn a_batch_lands_in_every_store() {
    let _guard = QUEUE.lock().await;
    let Some(fixture) = fixture().await else {
        eprintln!("DATABASE_URL or CLICKHOUSE_TEST_URL not set, skipping");
        return;
    };

    let player = Uuid::new_v4();
    enqueue(
        &fixture.db,
        fixture.server_id,
        &[
            json!({
                "type": "heartbeat",
                "timestamp": 1,
                "server": {
                    "online": 42, "max": 100, "tps": 19.8, "mspt": 12.4,
                    "memory_used_mb": 4096, "memory_max_mb": 8192,
                    "version": "1.21.4", "software": "DivineMC"
                },
                "plugins": [{ "name": fixture.plugin_name, "version": "1.4.2", "enabled": true }]
            }),
            json!({
                "type": "event", "timestamp": 2, "event": "player_join",
                "payload": { "player_uuid": player, "client_version": "1.21.4", "player_ip": "203.0.113.7" }
            }),
            json!({
                "type": "event", "timestamp": 3, "event": "player_quit",
                "payload": { "player_uuid": player }
            }),
            json!({
                "type": "error", "timestamp": 4, "plugin": fixture.plugin_name,
                "error": {
                    "message": "player 3f2504e0-4f89-11d3-9a0c-0305e82c3301 from 203.0.113.7 broke it",
                    "stacktrace": "at a.b.C(C.java:42)",
                    "level": "error",
                    "plugin_version": "1.4.2"
                }
            }),
            json!({
                "type": "metric", "timestamp": 5, "name": "economy.balance.total",
                "value": 1234.5, "labels": { "world": "overworld", "currency": "coins" }
            }),
            json!({ "type": "heartbeat", "timestamp": 6, "server": { "online": "not a number" } }),
        ],
    )
    .await;

    let handled = consumer::drain(&fixture.state).await.expect("drain");
    assert_eq!(handled, 6);

    let remaining: i64 =
        sqlx::query_scalar("SELECT count(*) FROM pulsify.ingest_queue WHERE project_id = $1")
            .bind(fixture.server_id)
            .fetch_one(&fixture.db)
            .await
            .unwrap();
    assert_eq!(remaining, 0, "the queue should be drained");

    // The malformed heartbeat is visible in the dead letters, not silently gone.
    let dead: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM pulsify.ingest_dead_letters WHERE project_id = $1",
    )
    .bind(fixture.server_id)
    .fetch_one(&fixture.db)
    .await
    .unwrap();
    assert_eq!(dead, 1);

    let metadata = pulsify::server_metadata_for(&fixture.db, &[fixture.server_id])
        .await
        .unwrap();
    assert_eq!(metadata.len(), 1);
    assert_eq!(metadata[0].software.as_deref(), Some("DivineMC"));
    assert_eq!(metadata[0].mc_version.as_deref(), Some("1.21.4"));

    let installations = pulsify::installations_of(&fixture.db, fixture.plugin_id)
        .await
        .unwrap();
    assert_eq!(installations.len(), 1);
    assert_eq!(installations[0].server_id, fixture.server_id);
    assert_eq!(installations[0].version, "1.4.2");
    assert!(installations[0].share_errors);

    let open: i64 =
        sqlx::query_scalar("SELECT count(*) FROM pulsify.open_sessions WHERE project_id = $1")
            .bind(fixture.server_id)
            .fetch_one(&fixture.db)
            .await
            .unwrap();
    assert_eq!(open, 0, "the quit should have closed the session");

    let issues = pulsify::issues_of(&fixture.db, fixture.server_id)
        .await
        .unwrap();
    assert_eq!(issues.len(), 1);
    assert_eq!(issues[0].status, "open");
    assert_eq!(issues[0].plugin, fixture.plugin_name);
    assert_eq!(issues[0].first_version.as_deref(), Some("1.4.2"));

    assert_eq!(
        count(&fixture.analytics, "events", fixture.server_id).await,
        5
    );
    assert_eq!(
        count(&fixture.analytics, "server_stats", fixture.server_id).await,
        1
    );
    assert_eq!(
        count(&fixture.analytics, "sessions", fixture.server_id).await,
        1
    );
    assert_eq!(
        count(&fixture.analytics, "errors", fixture.server_id).await,
        1
    );
    assert_eq!(
        count(&fixture.analytics, "custom_metrics", fixture.server_id).await,
        1
    );

    let groups = fixture
        .analytics
        .error_groups(fixture.server_id)
        .await
        .unwrap();
    assert_eq!(groups.len(), 1);
    assert_eq!(groups[0].fingerprint, issues[0].fingerprint);
    // Scrubbed at ingest: neither the UUID nor the IP ever reaches the analytics store.
    assert_eq!(groups[0].message, "player <uuid> from <ip> broke it");

    let sessions = fixture
        .analytics
        .recent_sessions(fixture.server_id, 24, 10)
        .await
        .unwrap();
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].player_uuid, player);
    assert_eq!(sessions[0].client_version, "1.21.4");
}

#[tokio::test]
async fn a_second_delivery_of_the_same_error_does_not_reopen_the_issue() {
    let _guard = QUEUE.lock().await;
    let Some(fixture) = fixture().await else {
        return;
    };

    let error = json!({
        "type": "error", "timestamp": 1, "plugin": "Quark",
        "error": { "message": "boom", "level": "error", "plugin_version": "1.0.0" }
    });

    enqueue(&fixture.db, fixture.server_id, std::slice::from_ref(&error)).await;
    consumer::drain(&fixture.state).await.expect("first drain");

    let first = pulsify::issues_of(&fixture.db, fixture.server_id)
        .await
        .unwrap();
    assert_eq!(first.len(), 1);

    enqueue(&fixture.db, fixture.server_id, std::slice::from_ref(&error)).await;
    consumer::drain(&fixture.state).await.expect("second drain");

    let second = pulsify::issues_of(&fixture.db, fixture.server_id)
        .await
        .unwrap();
    assert_eq!(second.len(), 1, "the same fingerprint must not fan out");
    assert_eq!(second[0].id, first[0].id);
    assert!(second[0].last_seen_at >= first[0].last_seen_at);
}

#[tokio::test]
async fn a_resolved_issue_reopens_only_on_a_newer_version() {
    let _guard = QUEUE.lock().await;
    let Some(fixture) = fixture().await else {
        return;
    };

    let error_on = |version: &str| {
        json!({
            "type": "error", "timestamp": 1, "plugin": "Quark",
            "error": { "message": "regression probe", "level": "error", "plugin_version": version }
        })
    };

    enqueue(&fixture.db, fixture.server_id, &[error_on("1.0.0")]).await;
    consumer::drain(&fixture.state).await.unwrap();

    let issue = pulsify::issues_of(&fixture.db, fixture.server_id)
        .await
        .unwrap()
        .into_iter()
        .find(|issue| issue.plugin == "Quark")
        .expect("issue");

    pulsify::set_issue_status(
        &fixture.db,
        fixture.server_id,
        &issue.fingerprint,
        "resolved",
        Some("1.0.0"),
        None,
        None,
    )
    .await
    .unwrap();

    enqueue(&fixture.db, fixture.server_id, &[error_on("1.0.0")]).await;
    consumer::drain(&fixture.state).await.unwrap();

    let same = pulsify::find_issue(&fixture.db, fixture.server_id, &issue.fingerprint)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(
        same.status, "resolved",
        "the same version is not a regression"
    );

    enqueue(&fixture.db, fixture.server_id, &[error_on("1.1.0")]).await;
    consumer::drain(&fixture.state).await.unwrap();

    let reopened = pulsify::find_issue(&fixture.db, fixture.server_id, &issue.fingerprint)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(reopened.status, "open");
    assert_eq!(reopened.status_version, None);
    assert_eq!(reopened.resolved_at, None);
}

#[tokio::test]
async fn an_abandoned_session_is_recorded_rather_than_lost() {
    let _guard = QUEUE.lock().await;
    let Some(fixture) = fixture().await else {
        return;
    };

    let player = Uuid::new_v4();
    let mut tx = fixture.db.begin().await.unwrap();
    pulsify::open_session(&mut tx, fixture.server_id, player, "1.21.4", "SE")
        .await
        .unwrap();
    tx.commit().await.unwrap();

    sqlx::query(
        "UPDATE pulsify.open_sessions SET joined_at = now() - interval '48 hours'
          WHERE project_id = $1 AND player_uuid = $2",
    )
    .bind(fixture.server_id)
    .bind(player)
    .execute(&fixture.db)
    .await
    .unwrap();

    let mut tx = fixture.db.begin().await.unwrap();
    let swept = pulsify::sweep_open_sessions(&mut tx, 24).await.unwrap();
    tx.commit().await.unwrap();

    assert!(swept.iter().any(|session| session.player_uuid == player));
}
