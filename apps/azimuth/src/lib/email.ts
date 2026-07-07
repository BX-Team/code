import type { EmailSender } from '../env';

const FROM = { email: 'account@bxteam.org', name: 'BX Team' } as const;

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function magicLinkEmail(url: string, email: string): { html: string; text: string } {
  const safeUrl = escapeHtml(url);
  const safeEmail = escapeHtml(email);

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0b0c0e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0c0e;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;background:#14161a;border:1px solid #24262b;border-radius:14px;">
            <tr>
              <td style="padding:32px 32px 8px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <span style="display:inline-block;font-size:16px;font-weight:700;color:#e6e8ea;letter-spacing:-0.01em;">BX&nbsp;Team</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:700;color:#e6e8ea;letter-spacing:-0.02em;">Sign in to BX Team</h1>
                <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#9aa0a6;">Click the button below to sign in. For your security this link expires in a few minutes and can only be used once.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center" bgcolor="#22b8c4" style="border-radius:10px;background:linear-gradient(120deg,#22b8c4,#2cc0a0);">
                      <a href="${safeUrl}" style="display:block;padding:13px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#08171a;text-decoration:none;border-radius:10px;">Sign in</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7075;">Or paste this URL into your browser:</p>
                <p style="margin:6px 0 0 0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${safeUrl}" style="color:#29b6cc;text-decoration:none;">${safeUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;border-top:1px solid #24262b;margin-top:24px;">
                <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#6b7075;">You're receiving this because a sign-in link was requested for <span style="color:#9aa0a6;">${safeEmail}</span>. If this wasn't you, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#4a4e53;">© BX Team · bxteam.org</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Sign in to BX Team

Use the link below to sign in. For your security it expires in a few minutes and can only be used once.

${url}

You're receiving this because a sign-in link was requested for ${email}. If this wasn't you, you can safely ignore this email.

© BX Team · bxteam.org`;

  return { html, text };
}

/** Sends a magic-link sign-in email via the Cloudflare Email Sending binding. */
export async function sendMagicLinkEmail(email: EmailSender, to: string, url: string): Promise<void> {
  const { html, text } = magicLinkEmail(url, to);
  await email.send({
    from: FROM,
    to,
    subject: 'Sign in to BX Team',
    html,
    text,
  });
}
