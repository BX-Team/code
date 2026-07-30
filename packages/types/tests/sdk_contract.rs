use types::ingest::{ErrorLevel, IngestEvent, PlayerAction, RawBatch};

/// Verbatim Jackson output from the published `org.bxteam.pulsify:sdk` jar — the SDK cannot be
/// changed, so this batch is the contract the ingest deserializer has to satisfy.
const SDK_BATCH: &str = include_str!("fixtures/sdk_batch.json");

#[test]
fn deserializes_a_batch_produced_by_the_java_sdk() {
    let events: Vec<IngestEvent> = serde_json::from_str(SDK_BATCH).unwrap();
    assert_eq!(events.len(), 7);
    assert_eq!(
        events.iter().map(IngestEvent::kind).collect::<Vec<_>>(),
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

    let IngestEvent::Heartbeat(heartbeat) = &events[0] else {
        panic!("expected heartbeat");
    };
    assert_eq!(heartbeat.server.online, 42);
    assert_eq!(heartbeat.server.max, 100);
    assert_eq!(heartbeat.server.tps, 19.8);
    assert_eq!(heartbeat.server.mspt, 12.4);
    assert_eq!(heartbeat.server.memory_used_mb, 4096);
    assert_eq!(heartbeat.server.memory_max_mb, 8192);
    assert_eq!(heartbeat.server.version, "1.21.4");
    assert_eq!(heartbeat.server.software, "DivineMC");
    assert_eq!(heartbeat.plugins.len(), 1);
    assert!(heartbeat.plugins[0].enabled);

    let IngestEvent::Event(join) = &events[1] else {
        panic!("expected player event");
    };
    assert_eq!(join.event, PlayerAction::PlayerJoin);
    assert_eq!(join.payload.client_version.as_deref(), Some("1.21.4"));
    assert_eq!(join.payload.player_ip.as_deref(), Some("203.0.113.7"));

    let IngestEvent::Event(quit) = &events[2] else {
        panic!("expected player event");
    };
    assert_eq!(quit.event, PlayerAction::PlayerQuit);
    assert_eq!(quit.payload.client_version, None);
    assert_eq!(quit.payload.player_ip, None);

    let IngestEvent::Error(fatal) = &events[3] else {
        panic!("expected error event");
    };
    assert_eq!(fatal.error.level, ErrorLevel::Fatal);
    assert_eq!(fatal.error.plugin_version.as_deref(), Some("1.4.2"));

    let IngestEvent::Error(warning) = &events[4] else {
        panic!("expected error event");
    };
    assert_eq!(warning.error.level, ErrorLevel::Warning);
    assert_eq!(warning.error.stacktrace, "");
    assert_eq!(warning.error.server_version, None);

    let IngestEvent::Metric(labelled) = &events[5] else {
        panic!("expected metric event");
    };
    assert_eq!(labelled.value, 1_234_567.0);
    assert_eq!(
        labelled.labels.get("world").map(String::as_str),
        Some("overworld")
    );

    let IngestEvent::Metric(bare) = &events[6] else {
        panic!("expected metric event");
    };
    assert!(bare.labels.is_empty());
}

#[test]
fn the_sdk_always_sends_an_array() {
    let raw: RawBatch = serde_json::from_str(SDK_BATCH).unwrap();
    assert_eq!(raw.into_vec().len(), 7);
}
