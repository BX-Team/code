use influx::{AppState, Config, card, router};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::from_env()?;
    let card = card();
    util::telemetry::init("influx", &card.banner("Influx"));

    let db = database::connect(&config.database_url, 8)?;
    database::migrate(&db).await?;

    let listener = tokio::net::TcpListener::bind(config.bind).await?;
    tracing::info!(bind = %config.bind, "listening");

    let state = AppState::new(db, config, card);
    axum::serve(listener, router(state))
        .with_graceful_shutdown(util::shutdown::signal())
        .await?;

    Ok(())
}
