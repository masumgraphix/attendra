import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(toEmail: string, code: string) {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Attendra HR <onboarding@resend.dev>';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin: 0; font-size: 22px;">Attendra HR Portal</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Password Reset Verification Code</p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 20px; text-align: center; border-radius: 12px; margin-bottom: 20px;">
        <p style="color: #334155; font-size: 14px; margin-top: 0;">Your 6-digit password reset verification code is:</p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; margin: 12px 0;">${code}</div>
        <p style="color: #64748b; font-size: 11px; margin: 0;">This code will expire in 15 minutes.</p>
      </div>

      <p style="color: #475569; font-size: 13px; line-height: 1.5;">
        If you did not request a password reset, please ignore this email or notify your Super Admin immediately.
      </p>

      <div style="margin-top: 24px; pt-12px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Attendra HR & Governance Platform.</p>
      </div>
    </div>
  `;

  if (!resend) {
    console.log(`[Email Service Simulation] RESEND_API_KEY not configured. Password reset code for ${toEmail}: ${code}`);
    return { success: true, simulated: true, code };
  }

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: 'Attendra HR - Password Reset Code',
      html,
    });
    if (data?.error) {
      console.error(`[Resend Email Error] Failed sending reset email to ${toEmail}:`, data.error);
      return { success: false, error: data.error };
    }
    console.log(`[Resend Email Sent] Reset code sent to ${toEmail}:`, data);
    return { success: true, data };
  } catch (err) {
    console.error(`[Resend Email Error] Failed sending reset email to ${toEmail}:`, err);
    return { success: false, error: err };
  }
}

export async function sendAccountApprovedEmail(toEmail: string, employeeName: string, password: string) {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Attendra HR <onboarding@resend.dev>';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin: 0; font-size: 22px;">Welcome to Attendra!</h2>
        <p style="color: #16a34a; font-size: 13px; font-weight: bold; margin-top: 4px;">Your Account Has Been Approved & Activated</p>
      </div>

      <p style="color: #334155; font-size: 14px;">Hello <strong>${employeeName}</strong>,</p>
      <p style="color: #475569; font-size: 13px; line-height: 1.5;">
        Your employee account request has been accepted by HR Admin. You can now sign in to the Attendra Employee Portal with the temporary credentials below:
      </p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 18px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; color: #166534; font-size: 13px;"><strong>Work Email:</strong> ${toEmail}</p>
        <p style="margin: 0; color: #166534; font-size: 13px;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-size: 16px; font-weight: bold; color: #15803d; background: #ffffff; padding: 2px 8px; border-radius: 6px; border: 1px solid #86efac;">${password}</span></p>
      </div>

      <p style="color: #475569; font-size: 12px; line-height: 1.5;">
        Please log in and update your password after your first sign in from your profile settings.
      </p>

      <div style="margin-top: 24px; pt-12px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Attendra Enterprise Portal</p>
      </div>
    </div>
  `;

  if (!resend) {
    console.log(`[Email Service Simulation] RESEND_API_KEY not configured. Welcome email for ${toEmail} with password: ${password}`);
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: 'Attendra Portal - Your Account Access Credentials',
      html,
    });
    // Resend's SDK does NOT throw for most API errors (e.g. unverified
    // domain / testing-mode 403) — it resolves normally with `data: null`
    // and the failure inside `error`. The old code only checked for a
    // thrown exception, so it reported success (and the UI showed "email
    // sent") even when nothing was actually delivered. Check `data.error`
    // explicitly so a genuine failure is surfaced as one.
    if (data?.error) {
      console.error(`[Resend Email Error] Failed sending activation email to ${toEmail}:`, data.error);
      return { success: false, error: data.error };
    }
    console.log(`[Resend Email Sent] Account activation email sent to ${toEmail}:`, data);
    return { success: true, data };
  } catch (err) {
    console.error(`[Resend Email Error] Failed sending activation email to ${toEmail}:`, err);
    return { success: false, error: err };
  }
}
