use std::sync::Arc;

use analytics::Analytics;
use database::Db;
use mail::Mailer;
use storage::Storage;
use types::build_info::ServiceCard;

use crate::env::Config;

/// Everything a handler needs; cloned per request, so all fields are cheap to clone.
#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub analytics: Analytics,
    pub storage: Storage,
    pub mailer: Mailer,
    pub http: reqwest::Client,
    pub card: ServiceCard,
    pub config: Arc<Config>,
}

impl AppState {
    pub fn new(
        db: Db,
        analytics: Analytics,
        storage: Storage,
        mailer: Mailer,
        card: ServiceCard,
        config: Config,
    ) -> Self {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap_or_default();

        Self {
            db,
            analytics,
            storage,
            mailer,
            http,
            card,
            config: Arc::new(config),
        }
    }
}
