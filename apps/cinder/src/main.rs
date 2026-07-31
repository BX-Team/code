use analytics::Analytics;
use cinder::{AppState, Config, card, consumer, scheduler};
use storage::Storage;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::from_env()?;
    let card = card();
    util::telemetry::init("cinder", &card.banner("Cinder"));

    let db = database::connect(&config.database_url, 16)?;
    database::migrate(&db).await?;

    let analytics = Analytics::new(
        &config.clickhouse_url,
        &config.clickhouse_database,
        &config.clickhouse_user,
        &config.clickhouse_password,
    );
    analytics.migrate().await?;

    let storage = Storage::new(&config.storage);
    let state = AppState::new(db, analytics, storage, config);
    util::systemd::notify_ready();

    tokio::spawn(scheduler::run(state.clone()));
    tokio::select! {
        () = consumer::run(state) => {}
        () = util::shutdown::signal() => {}
    }

    Ok(())
}
