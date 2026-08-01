use types::build_info::{BuildInfo, ServiceCard, git_hash, service_card};

pub mod alerts;
pub mod consumer;
pub mod env;
pub mod handlers;
pub mod scheduler;
pub mod state;

pub use env::Config;
pub use state::AppState;

pub const BUILD_INFO: BuildInfo = BuildInfo {
    git_hash: git_hash(option_env!("BX_GIT_HASH")),
    comp_date: env!("BX_COMP_DATE"),
    profile: env!("BX_PROFILE"),
};

pub fn card() -> ServiceCard {
    service_card("cinder", BUILD_INFO)
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Database(#[from] database::Error),

    #[error(transparent)]
    Analytics(#[from] analytics::Error),

    #[error(transparent)]
    Storage(#[from] storage::Error),
}

/// Truncates on a character boundary; byte slicing would panic on multi-byte text.
pub fn truncate(text: &str, max_chars: usize) -> String {
    match text.char_indices().nth(max_chars) {
        Some((index, _)) => text[..index].to_owned(),
        None => text.to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn truncation_never_splits_a_character() {
        assert_eq!(truncate("hello", 10), "hello");
        assert_eq!(truncate("hello", 2), "he");
        assert_eq!(truncate("привет", 3), "при");
        assert_eq!(truncate("", 5), "");
    }
}
