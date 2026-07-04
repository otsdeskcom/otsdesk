/**
 * OTS Desk — Transactional email via Brevo (free tier: 300/day)
 * ---------------------------------------------------------------------------
 * Sends OTP and billing emails from no-reply@otsdesk.com.
 * In development (no BREVO_API_KEY) it logs the email to console instead,
 * so signup/OTP flows can be tested without a real email account.
 * ---------------------------------------------------------------------------
 */
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@otsdesk.com';
const FROM_NAME  = 'OTS Desk';

async function sendEmail({ to, subject, html }) {
  // Dev fallback — no key set: just log it
  if (!BREVO_API_KEY) {
    console.log('\n[DEV EMAIL] to:', to, '| subject:', subject);
    console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), '\n');
    return { dev: true };
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: to }],
      subject, htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error('Email send failed: ' + (await res.text()));
  return res.json();
}

/* ---------- templates ---------- */
const shell = (body) => `
<div style="font-family:Poppins,Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden">
  <div style="background:#0D1B2A;padding:20px 24px;color:#fff;font-weight:700;font-size:18px">OTS <span style="color:#60A5FA">Desk</span></div>
  <div style="padding:24px;color:#0D1B2A;font-size:14px;line-height:1.6">${body}</div>
  <div style="padding:14px 24px;background:#F1F5F9;color:#64748B;font-size:11px">Track. Manage. Profit. · © OTS Desk</div>
</div>`;

function otpEmail(code, purpose) {
  const title = purpose === 'reset' ? 'Reset your password' : 'Verify your email';
  return {
    subject: `${code} is your OTS Desk verification code`,
    html: shell(`
      <h2 style="margin:0 0 10px">${title}</h2>
      <p>Use this code to continue. It expires in 10 minutes.</p>
      <div style="font-size:34px;font-weight:700;letter-spacing:8px;background:#EFF6FF;color:#2563EB;text-align:center;padding:16px;border-radius:10px;margin:16px 0">${code}</div>
      <p style="color:#64748B;font-size:12px">If you didn't request this, you can safely ignore this email.</p>`),
  };
}

function billingReminderEmail(name, daysLeft, chargeDate, amount) {
  return {
    subject: `Reminder: your OTS Desk plan renews on ${chargeDate}`,
    html: shell(`
      <h2 style="margin:0 0 10px">Hi ${name},</h2>
      <p>This is a friendly reminder that your OTS Desk subscription will renew in <b>${daysLeft} day(s)</b>.</p>
      <p>On <b>${chargeDate}</b>, your payment method will be charged <b>$${amount}</b>.</p>
      <p style="color:#64748B;font-size:12px">No action is needed to continue. You can manage or cancel anytime from your account.</p>`),
  };
}

module.exports = { sendEmail, otpEmail, billingReminderEmail };
