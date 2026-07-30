use std::collections::BTreeMap;

use analytics::writer::{
    Batch, ErrorPoint, EventPoint, MetricPoint, ServerStatsPoint, SessionPoint,
};
use analytics::{Analytics, Range};
use chrono::{Duration, Utc};
use uuid::Uuid;

/// Every dashboard query, executed against a real ClickHouse. Skipped when none is configured.
fn analytics() -> Option<Analytics> {
    let url = std::env::var("CLICKHOUSE_TEST_URL").ok()?;
    let database = std::env::var("CLICKHOUSE_TEST_DATABASE")
        .unwrap_or_else(|_| format!("bx_test_{}", Uuid::new_v4().simple()));
    let user = std::env::var("CLICKHOUSE_TEST_USER").unwrap_or_else(|_| "default".into());
    let password = std::env::var("CLICKHOUSE_TEST_PASSWORD").unwrap_or_default();
    Some(Analytics::new(&url, &database, &user, &password))
}

#[tokio::test]
async fn every_dashboard_query_runs() {
    let Some(analytics) = analytics() else {
        eprintln!("CLICKHOUSE_TEST_URL not set, skipping");
        return;
    };

    analytics.migrate().await.expect("migrate");

    let server = Uuid::new_v4();
    let plugin_server = Uuid::new_v4();
    let cohort_server = Uuid::new_v4();
    let player = Uuid::new_v4();
    let returning = Uuid::new_v4();
    let now = Utc::now();

    let mut batch = Batch::default();
    for minute in 0..3 {
        let timestamp = now - Duration::minutes(minute);
        batch.events.push(EventPoint {
            timestamp,
            project_id: server,
            kind: "heartbeat".into(),
            payload: "{}".into(),
        });
        batch.server_stats.push(ServerStatsPoint {
            timestamp,
            project_id: server,
            online: 40 + u32::try_from(minute).unwrap(),
            tps: 19.8,
            mspt: 12.4,
            memory_used_mb: 4096,
            memory_max_mb: 8192,
        });
    }

    batch.sessions.push(SessionPoint {
        timestamp: now - Duration::minutes(5),
        project_id: server,
        player_uuid: player,
        client_version: "1.21.4".into(),
        country_code: "SE".into(),
        abandoned: 0,
        duration_seconds: 1200,
    });
    for day in [2, 1] {
        batch.sessions.push(SessionPoint {
            timestamp: now - Duration::days(day),
            project_id: cohort_server,
            player_uuid: returning,
            client_version: "1.21.4".into(),
            country_code: "DE".into(),
            abandoned: 0,
            duration_seconds: 600,
        });
    }

    for project in [server, plugin_server] {
        batch.errors.push(ErrorPoint {
            timestamp: now,
            project_id: project,
            fingerprint: "4008fc19d658847e3080d5cf30d88e68".into(),
            plugin: "NDailyRewards".into(),
            level: "error".into(),
            server_version: "1.21.4".into(),
            server_software: "DivineMC".into(),
            plugin_version: "1.4.2".into(),
            message: "boom".into(),
        });
    }

    batch.metrics.push(MetricPoint {
        timestamp: now,
        project_id: server,
        name: "economy.balance.total".into(),
        labels: BTreeMap::from([
            ("world".to_string(), "overworld".to_string()),
            ("currency".to_string(), "coins".to_string()),
            ("tier".to_string(), "gold".to_string()),
            ("extra".to_string(), "yes".to_string()),
        ]),
        value: 1234.0,
    });

    analytics.write(&batch).await.expect("write");

    let projects = [server, plugin_server];

    assert_eq!(analytics.event_count(&projects, 24).await.unwrap(), 3);

    let series = analytics
        .server_timeseries(&projects, Range::H24)
        .await
        .unwrap();
    assert!(!series.is_empty());

    let peak = analytics.project_peak(&[server], 24).await.unwrap();
    assert!(peak.peak_online >= 40);
    assert_eq!(peak.unique_players, 1);

    let fingerprints = analytics.fingerprints_by_project(&projects).await.unwrap();
    assert_eq!(fingerprints.len(), 2);

    let groups = analytics.error_groups(server).await.unwrap();
    assert_eq!(groups.len(), 1);
    assert_eq!(groups[0].plugin, "NDailyRewards");
    assert_eq!(groups[0].count, 1);

    let versions = analytics
        .error_versions(server, &groups[0].fingerprint)
        .await
        .unwrap();
    assert_eq!(versions[0].label, "1.4.2");

    let cross = analytics
        .cross_error_groups(&projects, "NDailyRewards")
        .await
        .unwrap();
    assert_eq!(cross[0].servers, 2);

    assert_eq!(analytics.error_count_in_window(server, 5).await.unwrap(), 1);

    let sessions = analytics.recent_sessions(server, 24, 100).await.unwrap();
    assert_eq!(sessions.len(), 1);

    let totals = analytics.player_totals(server, 24).await.unwrap();
    assert_eq!(totals.unique_players, 1);
    assert_eq!(totals.new_players, 1);

    let countries = analytics.top_countries(server, Range::D7).await.unwrap();
    assert_eq!(countries.len(), 1);
    assert_eq!(countries[0].label, "SE");

    let client_versions = analytics
        .top_client_versions(server, Range::D7)
        .await
        .unwrap();
    assert_eq!(client_versions[0].label, "1.21.4");

    let duration = analytics.session_duration(server, Range::D7).await.unwrap();
    assert_eq!(duration.under_30m, 1);
    assert_eq!(duration.under_15m, 0);

    // The returning player joined on day -2 and came back on day -1: a retained D1 cohort of one.
    let retention = analytics.retention(cohort_server).await.unwrap();
    assert_eq!(retention.day1_cohort, 1);
    assert_eq!(retention.day1_returned, 1);

    let summaries = analytics
        .metric_summaries(server, Range::H24)
        .await
        .unwrap();
    assert_eq!(summaries[0].name, "economy.balance.total");

    let points = analytics
        .metric_series(server, "economy.balance.total", Range::H24)
        .await
        .unwrap();
    assert_eq!(points.len(), 1);
    assert_eq!(points[0].count, 1);
    assert_eq!(points[0].max, 1234.0);

    let project_series = analytics
        .project_timeseries(server, Range::H24)
        .await
        .unwrap();
    assert!(!project_series.is_empty());
    assert_eq!(project_series[0].memory_max, 8192.0);

    // Four labels, all of them queryable — the old three-slot layout could not reach the fourth.
    let labels = analytics
        .metric_labels(server, "economy.balance.total", Range::H24)
        .await
        .unwrap();
    let keys: Vec<&str> = labels.iter().map(|row| row.key.as_str()).collect();
    assert_eq!(keys, ["currency", "extra", "tier", "world"]);

    let open = analytics
        .open_error_counts(&projects, &[groups[0].fingerprint.clone()])
        .await
        .unwrap();
    assert!(open.is_empty());

    let open = analytics.open_error_counts(&projects, &[]).await.unwrap();
    assert_eq!(open.get(&server), Some(&1));
}
