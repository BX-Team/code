use std::sync::Arc;

use analytics::Analytics;
use database::Db;
use storage::Storage;
use types::build_info::ServiceCard;

use crate::env::Config;

/// Everything a handler needs; cloned per request, so all fields are cheap to clone.
#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub analytics: Analytics,
    pub storage: Storage,
    pub card: ServiceCard,
    pub config: Arc<Config>,
}

impl AppState {
    pub fn new(
        db: Db,
        analytics: Analytics,
        storage: Storage,
        card: ServiceCard,
        config: Config,
    ) -> Self {
        Self {
            db,
            analytics,
            storage,
            card,
            config: Arc::new(config),
        }
    }
}
