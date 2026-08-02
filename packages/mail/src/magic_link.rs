use crate::layout::{button, escape, shell};
use crate::{Error, Mailer};

pub const SUBJECT: &str = "Sign in to BX Team";

impl Mailer {
    /// Sends the sign-in link. Magic links are the only way in by email, so a failure here is a
    /// failure to authenticate — the caller must surface it, not swallow it.
    pub async fn send_magic_link(&self, to: &str, link: &str) -> Result<(), Error> {
        self.send(to, SUBJECT, text(link, to), html(link, to)).await
    }
}

fn text(link: &str, to: &str) -> String {
    format!(
        "Sign in to BX Team\n\n\
         Open this link to sign in. It works once and expires in 15 minutes.\n\n\
         {link}\n\n\
         If you did not ask to sign in, you can ignore this message.\n\
         This link was sent to {to}.\n"
    )
}

fn html(link: &str, to: &str) -> String {
    let content = format!(
        r#"<p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#9AA7B4;">This link works once and expires in 15 minutes.</p>
{}
<p style="margin:0 0 6px;font-size:12px;line-height:20px;color:#66727E;">If the button does not work, paste this into your browser:</p>
<p style="margin:0 0 20px;font-size:12px;line-height:20px;color:#22B8C4;word-break:break-all;">{}</p>"#,
        button(link, "Sign in"),
        escape(link)
    );

    shell(
        SUBJECT,
        &content,
        &format!("Sent to {to}. If you did not ask to sign in, you can ignore this message."),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_link_is_escaped_before_it_reaches_the_markup() {
        let body = html(
            "https://api.bxteam.org/auth/magic-link/verify?token=a&callbackURL=\"><script>",
            "user@example.com",
        );

        assert!(!body.contains("<script>"), "{body}");
        assert!(body.contains("token=a&amp;callbackURL="));
    }

    #[test]
    fn both_parts_carry_the_link_and_the_recipient() {
        let link = "https://api.bxteam.org/auth/magic-link/verify?token=abc";
        let plain = text(link, "user@example.com");

        assert!(plain.contains(link));
        assert!(plain.contains("user@example.com"));
        assert!(html(link, "user@example.com").contains(link));
    }
}
