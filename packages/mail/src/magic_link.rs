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
    let link = escape(link);
    let to = escape(to);

    format!(
        r#"<!doctype html>
<html><body style="margin:0;padding:0;background:#0B0F13;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F13;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#11171D;border:1px solid #1E262E;border-radius:14px;">
<tr><td style="padding:32px 32px 8px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
<h1 style="margin:0 0 8px;font-size:20px;line-height:28px;color:#E8EEF4;font-weight:600;">Sign in to BX Team</h1>
<p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#9AA7B4;">
This link works once and expires in 15 minutes.
</p>
</td></tr>
<tr><td align="center" style="padding:0 32px 28px;">
<a href="{link}" style="display:inline-block;padding:12px 28px;border-radius:10px;background:linear-gradient(90deg,#22B8C4,#2CC0A0);color:#06121A;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;">Sign in</a>
</td></tr>
<tr><td style="padding:0 32px 28px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
<p style="margin:0 0 6px;font-size:12px;line-height:20px;color:#66727E;">
If the button does not work, paste this into your browser:
</p>
<p style="margin:0;font-size:12px;line-height:20px;color:#22B8C4;word-break:break-all;">{link}</p>
</td></tr>
<tr><td style="padding:16px 32px 28px;border-top:1px solid #1E262E;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
<p style="margin:0;font-size:12px;line-height:20px;color:#66727E;">
Sent to {to}. If you did not ask to sign in, you can ignore this message.
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"#
    )
}

fn escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
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
