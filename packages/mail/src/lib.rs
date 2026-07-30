use lettre::message::{MultiPart, header};
use lettre::transport::smtp::AsyncSmtpTransport;
use lettre::{AsyncTransport, Message, Tokio1Executor};

pub mod magic_link;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("cannot reach the mail relay: {0}")]
    Transport(#[from] lettre::transport::smtp::Error),

    #[error("cannot build the message: {0}")]
    Message(#[from] lettre::error::Error),

    #[error("{0} is not a valid mailbox: {1}")]
    Address(String, lettre::address::AddressError),
}

/// Outgoing mail. In production this is a loopback postfix that signs and queues; replacing it
/// with a hosted provider is a change of URL, not of code.
#[derive(Clone)]
pub struct Mailer {
    transport: AsyncSmtpTransport<Tokio1Executor>,
    from: String,
}

impl Mailer {
    pub fn new(smtp_url: &str, from: &str) -> Result<Self, Error> {
        Ok(Self {
            transport: AsyncSmtpTransport::<Tokio1Executor>::from_url(smtp_url)?.build(),
            from: from.to_owned(),
        })
    }

    pub async fn send(
        &self,
        to: &str,
        subject: &str,
        text: String,
        html: String,
    ) -> Result<(), Error> {
        let message = Message::builder()
            .from(
                self.from
                    .parse()
                    .map_err(|error| Error::Address(self.from.clone(), error))?,
            )
            .to(to
                .parse()
                .map_err(|error| Error::Address(to.to_owned(), error))?)
            .subject(subject)
            .header(header::ContentType::TEXT_HTML)
            .multipart(MultiPart::alternative_plain_html(text, html))?;

        self.transport.send(message).await?;
        Ok(())
    }
}
