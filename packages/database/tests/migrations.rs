use database::models::pulsify::{IssueTransition, is_regression};

/// Applies the whole migration sequence to an empty database. Skipped without one.
#[tokio::test]
async fn migrations_apply_from_scratch() {
    let Ok(url) = std::env::var("DATABASE_URL") else {
        eprintln!("DATABASE_URL not set, skipping");
        return;
    };

    let db = database::connect(&url, 2).expect("connect");
    database::migrate(&db).await.expect("migrate");
    database::migrate(&db).await.expect("migrate is idempotent");

    let queued = database::queue::depth(&db).await.expect("queue depth");
    assert!(queued >= 0);
}

#[test]
fn regression_needs_evidence_that_something_changed() {
    assert!(!is_regression(None, Some("1.21.4")));
    assert!(is_regression(Some("1.21.4"), None));
    assert!(is_regression(Some("1.21.5"), Some("1.21.4")));
    assert!(!is_regression(Some("1.21.3"), Some("1.21.4")));
    assert!(!is_regression(Some("1.21.4"), Some("1.21.4")));
    assert_ne!(IssueTransition::NewIssue, IssueTransition::Regression);
}
