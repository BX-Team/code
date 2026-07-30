use aws_config::{BehaviorVersion, Region};
use aws_credential_types::Credentials;
use aws_sdk_s3::Client;
use aws_sdk_s3::config::Builder;

pub mod builds;
pub mod error_payloads;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("object storage request failed: {0}")]
    S3(String),

    #[error("stored payload is not valid JSON: {0}")]
    Payload(#[from] serde_json::Error),
}

impl<E, R> From<aws_sdk_s3::error::SdkError<E, R>> for Error
where
    E: std::fmt::Debug,
    R: std::fmt::Debug,
{
    fn from(error: aws_sdk_s3::error::SdkError<E, R>) -> Self {
        Self::S3(format!("{error:?}"))
    }
}

/// Connection settings for an S3-compatible endpoint; R2 in production, MinIO locally.
#[derive(Debug, Clone)]
pub struct Config {
    pub endpoint: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub builds_bucket: String,
    pub error_payloads_bucket: String,
    pub public_url: String,
}

/// Object storage handle. Cheap to clone.
#[derive(Clone)]
pub struct Storage {
    client: Client,
    builds_bucket: String,
    error_payloads_bucket: String,
    public_url: String,
}

impl Storage {
    pub fn new(config: &Config) -> Self {
        let credentials = Credentials::new(
            &config.access_key_id,
            &config.secret_access_key,
            None,
            None,
            "bx-team",
        );

        let s3 = Builder::new()
            .behavior_version(BehaviorVersion::latest())
            .region(Region::new("auto"))
            .endpoint_url(&config.endpoint)
            .credentials_provider(credentials)
            // R2 and MinIO both address buckets by path, not by subdomain.
            .force_path_style(true)
            .build();

        Self {
            client: Client::from_conf(s3),
            builds_bucket: config.builds_bucket.clone(),
            error_payloads_bucket: config.error_payloads_bucket.clone(),
            public_url: config.public_url.trim_end_matches('/').to_owned(),
        }
    }

    pub fn client(&self) -> &Client {
        &self.client
    }

    pub fn builds_bucket(&self) -> &str {
        &self.builds_bucket
    }

    pub fn error_payloads_bucket(&self) -> &str {
        &self.error_payloads_bucket
    }

    /// Public download URL of a build artifact; these links are permanent.
    pub fn public_url(&self, key: &str) -> String {
        format!("{}/{}", self.public_url, key)
    }
}

/// Build artifact key. Changing this breaks every download link ever published.
pub fn build_key(
    project_key: &str,
    version_key: &str,
    build_number: i64,
    file_name: &str,
) -> String {
    format!("{project_key}/versions/{version_key}/{build_number}/{file_name}")
}

pub fn content_type_for(file_name: &str) -> &'static str {
    if file_name.ends_with(".jar") {
        "application/java-archive"
    } else {
        "application/octet-stream"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_keys_match_the_published_download_urls() {
        assert_eq!(
            build_key("divinemc", "1.21.4", 142, "divinemc-1.21.4-142.jar"),
            "divinemc/versions/1.21.4/142/divinemc-1.21.4-142.jar"
        );
    }

    #[test]
    fn jars_are_served_as_java_archives() {
        assert_eq!(content_type_for("a.jar"), "application/java-archive");
        assert_eq!(content_type_for("a.zip"), "application/octet-stream");
    }
}
