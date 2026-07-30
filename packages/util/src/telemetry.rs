use tracing_subscriber::EnvFilter;

/// Installs the tracing subscriber from `RUST_LOG`, defaulting to `info`.
pub fn init(service: &str, banner: &str) {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(true)
        .init();

    tracing::info!(service, "{banner}");
}
