use analytics::Analytics;
use azimuth::{AppState, Config, card, router};
use mail::Mailer;
use storage::Storage;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::from_env()?;
    let card = card();
    util::telemetry::init("azimuth", &card.banner("Azimuth"));

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
    let mailer = Mailer::new(&config.smtp_url, &config.email_from)?;

    let listener = tokio::net::TcpListener::bind(config.bind).await?;
    tracing::info!(bind = %config.bind, "listening");

    let state = AppState::new(db, analytics, storage, mailer, card, config);
    axum::serve(listener, router(state))
        .with_graceful_shutdown(util::shutdown::signal())
        .await?;

    Ok(())
}
