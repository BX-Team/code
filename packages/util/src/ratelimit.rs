use std::num::NonZeroU32;
use std::sync::Arc;
use std::time::Duration;

use governor::clock::DefaultClock;
use governor::state::keyed::DefaultKeyedStateStore;
use governor::{Quota, RateLimiter};

use crate::ApiError;

type Keyed = RateLimiter<String, DefaultKeyedStateStore<String>, DefaultClock>;

/// Per-key request limiter. On a single node this is exact, unlike an edge binding.
#[derive(Clone)]
pub struct Limiter {
    inner: Arc<Keyed>,
    retry_after: u64,
}

impl Limiter {
    /// `per_minute` requests per key, with a burst of the same size.
    pub fn per_minute(per_minute: u32) -> Self {
        let quota = Quota::per_minute(NonZeroU32::new(per_minute.max(1)).unwrap());
        let inner = Arc::new(RateLimiter::keyed(quota));

        let sweeper = Arc::clone(&inner);
        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(Duration::from_secs(600));
            loop {
                ticker.tick().await;
                sweeper.retain_recent();
            }
        });

        Self {
            inner,
            retry_after: 60,
        }
    }

    pub fn check(&self, key: &str) -> Result<(), ApiError> {
        self.inner
            .check_key(&key.to_owned())
            .map_err(|_| ApiError::TooManyRequests {
                retry_after: self.retry_after,
                message: "Rate limit exceeded".into(),
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn keys_are_limited_independently() {
        let limiter = Limiter::per_minute(2);

        assert!(limiter.check("a").is_ok());
        assert!(limiter.check("a").is_ok());
        assert!(limiter.check("a").is_err());
        assert!(limiter.check("b").is_ok());
    }

    #[tokio::test]
    async fn exceeding_the_limit_asks_the_client_to_wait() {
        let limiter = Limiter::per_minute(1);
        limiter.check("token").unwrap();

        let Err(ApiError::TooManyRequests { retry_after, .. }) = limiter.check("token") else {
            panic!("expected a rate limit error");
        };
        assert_eq!(retry_after, 60);
    }
}
