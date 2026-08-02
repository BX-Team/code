use lettre::message::{MultiPart, header};
use lettre::transport::smtp::AsyncSmtpTransport;
use lettre::{AsyncTransport, Message, Tokio1Executor};

mod layout;

pub mod announcement;
pub mod magic_link;
pub mod moderation;

pub use announcement::{Action, Announcement};

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
        self.deliver(
            to,
            subject,
            MultiPart::alternative_plain_html(text, html).into(),
        )
        .await
    }

    /// Sends the body exactly as written, with no markup around it.
    pub async fn send_text(&self, to: &str, subject: &str, text: String) -> Result<(), Error> {
        self.deliver(to, subject, Body::Text(text)).await
    }

    async fn deliver(&self, to: &str, subject: &str, body: Body) -> Result<(), Error> {
        self.transport
            .send(compose(&self.from, to, subject, body)?)
            .await?;
        Ok(())
    }
}

fn compose(from: &str, to: &str, subject: &str, body: Body) -> Result<Message, Error> {
    let builder = Message::builder()
        .from(
            from.parse()
                .map_err(|error| Error::Address(from.to_owned(), error))?,
        )
        .to(to
            .parse()
            .map_err(|error| Error::Address(to.to_owned(), error))?)
        .subject(subject);

    Ok(match body {
        Body::Text(text) => builder.header(header::ContentType::TEXT_PLAIN).body(text)?,
        Body::Multipart(parts) => builder.multipart(parts)?,
    })
}

enum Body {
    Text(String),
    Multipart(MultiPart),
}

impl From<MultiPart> for Body {
    fn from(parts: MultiPart) -> Self {
        Self::Multipart(parts)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn headers_of(body: Body) -> String {
        let message = compose(
            "BX Team <no-reply@bxteam.org>",
            "user@example.com",
            "Test",
            body,
        )
        .unwrap();
        let formatted = String::from_utf8(message.formatted()).unwrap();

        formatted.split("\r\n\r\n").next().unwrap().to_owned()
    }

    #[test]
    fn a_message_declares_its_type_exactly_once() {
        let multipart = headers_of(
            MultiPart::alternative_plain_html(String::from("text"), String::from("<p>html</p>"))
                .into(),
        );
        assert_eq!(multipart.matches("Content-Type:").count(), 1, "{multipart}");
        assert!(multipart.contains("multipart/alternative"), "{multipart}");

        let plain = headers_of(Body::Text("text".into()));
        assert_eq!(plain.matches("Content-Type:").count(), 1, "{plain}");
        assert!(plain.contains("text/plain"), "{plain}");
    }
}
