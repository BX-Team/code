use crate::layout::{paragraphs, shell};
use crate::{Error, Mailer};

pub const BAN_SUBJECT: &str = "Your BX Team account has been suspended";
pub const DELETED_SUBJECT: &str = "Your BX Team account has been deleted";

impl Mailer {
    pub async fn send_ban_notice(
        &self,
        to: &str,
        name: &str,
        reason: Option<&str>,
        until: Option<&str>,
    ) -> Result<(), Error> {
        let body = ban_body(name, reason, until);
        self.send(
            to,
            BAN_SUBJECT,
            plain(BAN_SUBJECT, &body, to),
            shell(BAN_SUBJECT, &paragraphs(&body), &footer(to)),
        )
        .await
    }

    pub async fn send_account_deleted(&self, to: &str, name: &str) -> Result<(), Error> {
        let body = deleted_body(name);
        self.send(
            to,
            DELETED_SUBJECT,
            plain(DELETED_SUBJECT, &body, to),
            shell(DELETED_SUBJECT, &paragraphs(&body), &footer(to)),
        )
        .await
    }
}

fn ban_body(name: &str, reason: Option<&str>, until: Option<&str>) -> String {
    let reason = match reason {
        Some(reason) => format!("\n\nReason: {reason}"),
        None => String::new(),
    };

    let until = match until {
        Some(until) => format!("\n\nThe suspension lifts on {until}."),
        None => "\n\nThe suspension does not expire on its own.".to_owned(),
    };

    format!(
        "Hi {name},\n\nYour BX Team account has been suspended. You can no longer sign in or \
         access your projects while the suspension is in place.{reason}{until}\n\n\
         If you believe this is a mistake, reach out to the BX Team through our community \
         channels and we will take another look."
    )
}

fn deleted_body(name: &str) -> String {
    format!(
        "Hi {name},\n\nYour BX Team account has been deleted by an administrator. Your projects, \
         ingest tokens and stored telemetry were removed with it and cannot be restored.\n\n\
         If you believe this is a mistake, reach out to the BX Team through our community channels."
    )
}

fn plain(heading: &str, body: &str, to: &str) -> String {
    format!("{heading}\n\n{body}\n\n{}\n", footer(to))
}

fn footer(to: &str) -> String {
    format!("Sent to {to} by the BX Team.")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_permanent_ban_says_so_and_a_timed_one_names_the_date() {
        let permanent = ban_body("nonplay", Some("Spam"), None);
        assert!(permanent.contains("Reason: Spam"));
        assert!(permanent.contains("does not expire on its own"));

        let timed = ban_body("nonplay", None, Some("12 August 2026"));
        assert!(!timed.contains("Reason:"));
        assert!(timed.contains("lifts on 12 August 2026"));
    }

    #[test]
    fn a_hostile_ban_reason_cannot_inject_markup() {
        let body = ban_body("nonplay", Some("<script>alert(1)</script>"), None);
        let html = shell(BAN_SUBJECT, &paragraphs(&body), &footer("user@example.com"));

        assert!(!html.contains("<script>"), "{html}");
    }
}
