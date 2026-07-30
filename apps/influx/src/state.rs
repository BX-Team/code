use std::time::Duration;

use database::Db;
use moka::future::Cache;
use types::build_info::ServiceCard;
use util::ratelimit::Limiter;
use uuid::Uuid;

use crate::env::Config;

/// Everything a request handler needs; cloned per request, so all fields are cheap to clone.
#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub config: Config,
    pub limiter: Limiter,
    pub card: ServiceCard,
    quotas: Cache<Uuid, i64>,
}

impl AppState {
    pub fn new(db: Db, config: Config, card: ServiceCard) -> Self {
        let limiter = Limiter::per_minute(config.requests_per_minute);

        Self {
            db,
            limiter,
            card,
            config,
            quotas: Cache::builder()
                .max_capacity(10_000)
                .time_to_live(Duration::from_secs(60))
                .build(),
        }
    }

    /// The owner's daily event allowance. Cached briefly so ingest does not join on every batch.
    pub async fn daily_quota(&self, project_id: Uuid) -> Result<i64, database::Error> {
        if let Some(quota) = self.quotas.get(&project_id).await {
            return Ok(quota);
        }

        let quota = database::models::pulsify::project_event_quota(&self.db, project_id)
            .await?
            .unwrap_or(100_000);

        self.quotas.insert(project_id, quota).await;
        Ok(quota)
    }
}
