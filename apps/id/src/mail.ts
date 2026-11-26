import { WorkerMailer } from 'worker-mailer';

export function sendCode(env: Env, to: string, code: string) {
  return WorkerMailer.send(
    {
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: true,
      credentials: { username: env.SMTP_USERNAME, password: env.SMTP_PASSWORD },
      authType: 'plain',
      name: new URL(env.BASE_URL).hostname,
    },
    {
      from: { name: 'BX ID', email: env.MAIL_FROM },
      to: { email: to },
      subject: `${code} is your BX ID code`,
      text: `Your BX ID sign-in code is ${code}.\n\nIt expires in 5 minutes. If you did not ask for it, ignore this email.`,
      html: `<p>Your BX ID sign-in code is</p><p style="font-size:28px;font-weight:600;letter-spacing:4px">${code}</p><p>It expires in 5 minutes. If you did not ask for it, ignore this email.</p>`,
    },
  );
}
