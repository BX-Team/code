use std::sync::Arc;

use analytics::Analytics;
use database::Db;
use geoip::Geoip;
use storage::Storage;

use crate::env::Config;

/// Shared handles for the consumer and the scheduler.
#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub analytics: Analytics,
    pub storage: Storage,
    pub geoip: Option<Arc<Geoip>>,
    pub http: reqwest::Client,
    pub config: Arc<Config>,
}

impl AppState {
    pub fn new(db: Db, analytics: Analytics, storage: Storage, config: Config) -> Self {
        let geoip = config.ipinfo_mmdb_path.as_ref().and_then(|path| {
            match Geoip::open(path) {
                Ok(geoip) => Some(Arc::new(geoip)),
                // Events matter more than their country: keep ingesting without geolocation.
                Err(error) => {
                    tracing::error!(%error, "geoip disabled");
                    None
                }
            }
        });

        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_default();

        Self {
            db,
            analytics,
            storage,
            geoip,
            http,
            config: Arc::new(config),
        }
    }

    pub fn country_of(&self, ip: Option<&str>) -> String {
        match (&self.geoip, ip) {
            (Some(geoip), Some(ip)) => geoip.country(ip),
            _ => String::new(),
        }
    }
}
