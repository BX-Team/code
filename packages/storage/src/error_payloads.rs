use aws_sdk_s3::primitives::ByteStream;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{Error, Storage};

/// Full error report. Already scrubbed — unscrubbed text never reaches storage.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ErrorPayload {
    pub plugin: String,
    pub message: String,
    pub stacktrace: String,
    pub level: String,
    pub server_version: String,
    pub server_software: String,
    pub plugin_version: String,
    pub timestamp: i64,
}

/// Object key. The fixed-width millisecond suffix makes lexical order chronological order.
pub fn key(project_id: Uuid, fingerprint: &str, at: DateTime<Utc>) -> String {
    format!(
        "{project_id}/{fingerprint}/{:013}.json",
        at.timestamp_millis()
    )
}

impl Storage {
    pub async fn put_error_payload(
        &self,
        project_id: Uuid,
        fingerprint: &str,
        at: DateTime<Utc>,
        payload: &ErrorPayload,
    ) -> Result<(), Error> {
        let body = serde_json::to_vec(payload)?;

        self.client()
            .put_object()
            .bucket(self.error_payloads_bucket())
            .key(key(project_id, fingerprint, at))
            .content_type("application/json")
            .body(ByteStream::from(body))
            .send()
            .await?;

        Ok(())
    }

    /// Most recent payload for a fingerprint, or `None` when nothing was ever stored.
    pub async fn latest_error_payload(
        &self,
        project_id: Uuid,
        fingerprint: &str,
    ) -> Result<Option<ErrorPayload>, Error> {
        let prefix = format!("{project_id}/{fingerprint}/");
        let mut latest: Option<String> = None;
        let mut token: Option<String> = None;

        loop {
            let page = self
                .client()
                .list_objects_v2()
                .bucket(self.error_payloads_bucket())
                .prefix(&prefix)
                .set_continuation_token(token)
                .send()
                .await?;

            for object in page.contents() {
                if let Some(object_key) = object.key()
                    && latest.as_deref().is_none_or(|current| object_key > current)
                {
                    latest = Some(object_key.to_owned());
                }
            }

            token = page.next_continuation_token().map(ToOwned::to_owned);
            if token.is_none() {
                break;
            }
        }

        let Some(latest) = latest else {
            return Ok(None);
        };

        let object = self
            .client()
            .get_object()
            .bucket(self.error_payloads_bucket())
            .key(latest)
            .send()
            .await?;

        let bytes = object
            .body
            .collect()
            .await
            .map_err(|error| Error::S3(error.to_string()))?
            .into_bytes();

        Ok(Some(serde_json::from_slice(&bytes)?))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_sort_chronologically_as_strings() {
        let project = Uuid::nil();
        let early = key(
            project,
            "abc",
            DateTime::from_timestamp(1_700_000_000, 0).unwrap(),
        );
        let late = key(
            project,
            "abc",
            DateTime::from_timestamp(1_800_000_000, 0).unwrap(),
        );

        assert!(early < late, "{early} should sort before {late}");
        assert!(early.starts_with(&format!("{project}/abc/")));
    }
}
