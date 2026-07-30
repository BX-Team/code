use std::time::Duration;

use sqlx::postgres::PgPoolOptions;

pub mod models;
pub mod queue;

pub use sqlx::{Error, PgPool as Db, PgTransaction as Transaction};

/// Opens the pool. Connections are lazy so a service survives Postgres being slow to come up.
pub fn connect(url: &str, max_connections: u32) -> Result<Db, Error> {
    PgPoolOptions::new()
        .max_connections(max_connections)
        .acquire_timeout(Duration::from_secs(10))
        .connect_lazy(url)
}

/// Applies pending migrations; every service does this on startup, deploy has no separate step.
pub async fn migrate(db: &Db) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(db).await
}
