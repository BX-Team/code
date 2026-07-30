use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{CompletedMultipartUpload, CompletedPart};
use bytes::{Bytes, BytesMut};
use futures::{Stream, StreamExt};
use sha2::{Digest, Sha256};

use crate::{Error, Storage};

/// S3 requires every part but the last to be at least 5 MiB.
const PART_SIZE: usize = 8 * 1024 * 1024;

/// What a finished upload turned out to be — neither is known before the last byte arrives.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Uploaded {
    pub size: u64,
    pub sha256: String,
}

impl Storage {
    /// Streams a build artifact into the bucket, hashing it on the way through.
    ///
    /// Nothing is buffered beyond one part, so a 500 MB jar costs 8 MB of memory rather than 500.
    pub async fn put_build_streaming<S>(
        &self,
        key: &str,
        content_type: &str,
        mut chunks: S,
    ) -> Result<Uploaded, Error>
    where
        S: Stream<Item = Result<Bytes, String>> + Unpin,
    {
        let started = self
            .client()
            .create_multipart_upload()
            .bucket(self.builds_bucket())
            .key(key)
            .content_type(content_type)
            .send()
            .await?;

        let Some(upload_id) = started.upload_id() else {
            return Err(Error::S3("the bucket did not return an upload id".into()));
        };

        match self.stream_parts(key, upload_id, &mut chunks).await {
            Ok(uploaded) => Ok(uploaded),
            Err(error) => {
                // Abandoned parts are billed until they are cleaned up, so never just walk away.
                let _ = self
                    .client()
                    .abort_multipart_upload()
                    .bucket(self.builds_bucket())
                    .key(key)
                    .upload_id(upload_id)
                    .send()
                    .await;
                Err(error)
            }
        }
    }

    async fn stream_parts<S>(
        &self,
        key: &str,
        upload_id: &str,
        chunks: &mut S,
    ) -> Result<Uploaded, Error>
    where
        S: Stream<Item = Result<Bytes, String>> + Unpin,
    {
        let mut hasher = Sha256::new();
        let mut buffer = BytesMut::with_capacity(PART_SIZE);
        let mut parts: Vec<CompletedPart> = Vec::new();
        let mut size: u64 = 0;

        while let Some(chunk) = chunks.next().await {
            let chunk = chunk.map_err(Error::S3)?;
            hasher.update(&chunk);
            size += chunk.len() as u64;
            buffer.extend_from_slice(&chunk);

            while buffer.len() >= PART_SIZE {
                let part = buffer.split_to(PART_SIZE).freeze();
                parts.push(
                    self.upload_part(key, upload_id, parts.len() + 1, part)
                        .await?,
                );
            }
        }

        if !buffer.is_empty() || parts.is_empty() {
            let part = buffer.freeze();
            parts.push(
                self.upload_part(key, upload_id, parts.len() + 1, part)
                    .await?,
            );
        }

        self.client()
            .complete_multipart_upload()
            .bucket(self.builds_bucket())
            .key(key)
            .upload_id(upload_id)
            .multipart_upload(
                CompletedMultipartUpload::builder()
                    .set_parts(Some(parts))
                    .build(),
            )
            .send()
            .await?;

        Ok(Uploaded {
            size,
            sha256: hex::encode(hasher.finalize()),
        })
    }

    async fn upload_part(
        &self,
        key: &str,
        upload_id: &str,
        number: usize,
        body: Bytes,
    ) -> Result<CompletedPart, Error> {
        let number = i32::try_from(number).map_err(|_| Error::S3("too many parts".into()))?;

        let part = self
            .client()
            .upload_part()
            .bucket(self.builds_bucket())
            .key(key)
            .upload_id(upload_id)
            .part_number(number)
            .body(ByteStream::from(body))
            .send()
            .await?;

        Ok(CompletedPart::builder()
            .part_number(number)
            .set_e_tag(part.e_tag().map(ToOwned::to_owned))
            .build())
    }

    pub async fn delete_build(&self, key: &str) -> Result<(), Error> {
        self.client()
            .delete_object()
            .bucket(self.builds_bucket())
            .key(key)
            .send()
            .await?;
        Ok(())
    }
}
