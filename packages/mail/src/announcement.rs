use crate::layout::{button, paragraphs, shell};
use crate::{Error, Mailer};

/// An official message from the team: a headline, prose, and an optional call to action.
#[derive(Debug)]
pub struct Announcement<'a> {
    pub subject: &'a str,
    pub heading: &'a str,
    pub body: &'a str,
    pub action: Option<Action<'a>>,
}

#[derive(Debug)]
pub struct Action<'a> {
    pub label: &'a str,
    pub href: &'a str,
}

impl Mailer {
    /// The branded template support replies and service notices go out in.
    pub async fn send_announcement(
        &self,
        to: &str,
        message: &Announcement<'_>,
    ) -> Result<(), Error> {
        self.send(to, message.subject, text(message, to), html(message, to))
            .await
    }
}

fn text(message: &Announcement<'_>, to: &str) -> String {
    let action = match &message.action {
        Some(action) => format!("\n{}: {}\n", action.label, action.href),
        None => String::new(),
    };

    format!(
        "{}\n\n{}\n{action}\nSent to {to} by the BX Team.\n",
        message.heading,
        message.body.trim()
    )
}

fn html(message: &Announcement<'_>, to: &str) -> String {
    let mut content = paragraphs(message.body);

    if let Some(action) = &message.action {
        content.push_str(&button(action.href, action.label));
    }

    shell(
        message.heading,
        &content,
        &format!("Sent to {to} by the BX Team."),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_body_and_action_are_escaped() {
        let message = Announcement {
            subject: "Reply",
            heading: "About your report",
            body: "<script>alert(1)</script>",
            action: Some(Action {
                label: "Open\"><script>",
                href: "https://bxteam.org/a?b=1&c=2",
            }),
        };

        let body = html(&message, "user@example.com");

        assert!(!body.contains("<script>"), "{body}");
        assert!(body.contains("https://bxteam.org/a?b=1&amp;c=2"));
    }

    #[test]
    fn the_plain_part_carries_the_action_url() {
        let message = Announcement {
            subject: "Reply",
            heading: "About your report",
            body: "We looked into it.",
            action: Some(Action {
                label: "Open the dashboard",
                href: "https://bxteam.org/dashboard",
            }),
        };

        let plain = text(&message, "user@example.com");

        assert!(plain.contains("About your report"));
        assert!(plain.contains("We looked into it."));
        assert!(plain.contains("Open the dashboard: https://bxteam.org/dashboard"));
        assert!(plain.contains("user@example.com"));
    }
}
