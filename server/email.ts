import { Resend } from 'resend';

export type EmailResult = { success: boolean; simulated?: boolean; error?: any };

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

const appUrl = () => process.env.APP_URL || 'https://attendra-sage.vercel.app';

const layout = (title: string, subtitle: string, body: string) => `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff">
    <div style="text-align:center;margin-bottom:20px">
      <h2 style="color:#1e293b;margin:0;font-size:22px">${esc(title)}</h2>
      <p style="color:#64748b;font-size:13px;margin-top:4px">${esc(subtitle)}</p>
    </div>
    ${body}
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #f1f5f9;text-align:center">
      <p style="color:#94a3b8;font-size:11px;margin:0">&copy; ${new Date().getFullYear()} Attendra — Attendance &amp; HR</p>
    </div>
  </div>`;

const credentialBox = (email: string, password: string) => `
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:18px;border-radius:12px;margin:20px 0">
    <p style="margin:0 0 8px 0;color:#166534;font-size:13px"><strong>Email:</strong> ${esc(email)}</p>
    <p style="margin:0;color:#166534;font-size:13px"><strong>Temporary password:</strong>
      <span style="font-family:monospace;font-size:16px;font-weight:bold;color:#15803d;background:#fff;padding:2px 8px;border-radius:6px;border:1px solid #86efac">${esc(password)}</span></p>
  </div>
  <p style="text-align:center"><a href="${appUrl()}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-weight:bold;font-size:14px">Sign in to Attendra</a></p>
  <p style="color:#475569;font-size:12px">You will be asked to choose a new password after signing in.</p>`;

async function send(to: string, subject: string, html: string, logHint: string): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email simulated] to=${to} subject="${subject}" (${logHint})`);
    return { success: true, simulated: true };
  }
  try {
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || 'Attendra <onboarding@resend.dev>';
    const r = await resend.emails.send({ from, to: [to], subject, html });
    if (r?.error) {
      console.error(`[email] failed to ${to}:`, r.error);
      return { success: false, error: r.error };
    }
    return { success: true };
  } catch (err) {
    console.error(`[email] failed to ${to}:`, err);
    return { success: false, error: err };
  }
}

export const sendPasswordResetEmail = (to: string, code: string) =>
  send(
    to,
    'Attendra — your password reset code',
    layout('Password reset', 'Use this code to set a new password', `
      <div style="background:#f8fafc;border:1px solid #cbd5e1;padding:20px;text-align:center;border-radius:12px;margin-bottom:20px">
        <div style="font-size:32px;font-weight:800;letter-spacing:6px;color:#2563eb;margin:12px 0">${esc(code)}</div>
        <p style="color:#64748b;font-size:11px;margin:0">This code expires in 15 minutes.</p>
      </div>
      <p style="color:#475569;font-size:13px">If you did not request this, you can ignore this email.</p>`),
    'reset code'
  );

export const sendAccountApprovedEmail = (to: string, name: string, password: string, companyName: string) =>
  send(
    to,
    `Your ${companyName} Attendra account is ready`,
    layout(`Welcome to ${companyName}`, 'Your Attendra account has been activated', `
      <p style="color:#334155;font-size:14px">Hello <strong>${esc(name)}</strong>,</p>
      <p style="color:#475569;font-size:13px;line-height:1.5">An administrator at <strong>${esc(companyName)}</strong> created your account. Sign in with the details below:</p>
      ${credentialBox(to, password)}`),
    'account approved'
  );

export const sendCompanyCreatedEmail = (to: string, name: string, password: string, companyName: string) =>
  send(
    to,
    `${companyName} is ready on Attendra`,
    layout('Your company is ready', companyName, `
      <p style="color:#334155;font-size:14px">Hello <strong>${esc(name)}</strong>,</p>
      <p style="color:#475569;font-size:13px;line-height:1.5">An Attendra workspace has been created for <strong>${esc(companyName)}</strong> and you are its Super Admin.</p>
      ${credentialBox(to, password)}`),
    'company created'
  );

export const sendWelcomeEmail = (to: string, name: string, companyName: string, trialDays: number) =>
  send(
    to,
    `Welcome to Attendra, ${name}`,
    layout('Welcome to Attendra', companyName, `
      <p style="color:#334155;font-size:14px">Hello <strong>${esc(name)}</strong>,</p>
      <p style="color:#475569;font-size:13px;line-height:1.5">Your workspace for <strong>${esc(companyName)}</strong> is ready. Your free trial runs for ${trialDays} days.</p>
      <p style="text-align:center"><a href="${appUrl()}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-weight:bold;font-size:14px">Open Attendra</a></p>`),
    'welcome'
  );
