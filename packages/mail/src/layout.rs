pub(crate) fn escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

pub(crate) fn paragraphs(body: &str) -> String {
    body.split("\n\n")
        .map(str::trim)
        .filter(|block| !block.is_empty())
        .map(|block| {
            format!(
                r#"<p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#9AA7B4;">{}</p>"#,
                escape(block).replace('\n', "<br>")
            )
        })
        .collect()
}

pub(crate) fn button(href: &str, label: &str) -> String {
    format!(
        r#"<p style="margin:0 0 24px;text-align:center;"><a href="{}" style="display:inline-block;padding:12px 28px;border-radius:10px;background:linear-gradient(90deg,#22B8C4,#2CC0A0);color:#06121A;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;">{}</a></p>"#,
        escape(href),
        escape(label)
    )
}

/// `heading` and `footer` are plain text; `content` is markup the caller has already escaped.
pub(crate) fn shell(heading: &str, content: &str, footer: &str) -> String {
    let heading = escape(heading);
    let footer = escape(footer);

    format!(
        r#"<!doctype html>
<html><body style="margin:0;padding:0;background:#0B0F13;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F13;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#11171D;border:1px solid #1E262E;border-radius:14px;">
<tr><td style="padding:32px 32px 8px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
<h1 style="margin:0 0 16px;font-size:20px;line-height:28px;color:#E8EEF4;font-weight:600;">{heading}</h1>
{content}
</td></tr>
<tr><td style="padding:16px 32px 28px;border-top:1px solid #1E262E;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
<p style="margin:0;font-size:12px;line-height:20px;color:#66727E;">{footer}</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"#
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_heading_and_footer_are_escaped() {
        let body = shell("<script>x</script>", "<p>ok</p>", "sent to <b>a@b.c</b>");

        assert!(!body.contains("<script>"), "{body}");
        assert!(!body.contains("<b>a@b.c</b>"), "{body}");
        assert!(body.contains("<p>ok</p>"));
    }

    #[test]
    fn prose_becomes_one_paragraph_per_block() {
        let html = paragraphs("first line\nsame block\n\nsecond block\n\n\n");

        assert_eq!(html.matches("<p ").count(), 2);
        assert!(html.contains("first line<br>same block"));
    }
}
