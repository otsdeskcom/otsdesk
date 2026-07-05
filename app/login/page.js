'use client';
import { useState } from 'react';
 
const API = process.env.NEXT_PUBLIC_API_URL || '';
 
export default function LoginPage() {
  const [view, setView] = useState('login'); // login | signup | otp | forgot | newpass
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
 
  // form fields
  const [f, setF] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    company: '', platform: 'Walmart', heardFrom: 'Google',
    otp: ['', '', '', '', '', ''], newPass: '', newPass2: '',
  });
  const [resetTicket, setResetTicket] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
 
  async function api(path, body) {
    setErr(''); setLoading(true);
    try {
      const r = await fetch(`${API}/api/auth/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      setLoading(false);
      if (!r.ok) { setErr(data.error || 'Something went wrong'); return null; }
      return data;
    } catch (e) { setLoading(false); setErr('Network error — please try again'); return null; }
  }
 
  async function doLogin() {
    const d = await api('login', { email: f.email, password: f.password });
    if (d?.accessToken) { saveTokens(d); window.location.href = '/dashboard'; }
    else if (d?.needOtp) { setMsg('Please verify your email'); setView('otp'); }
  }
  async function doSignup() {
    if (f.password.length < 8) { setErr('Password must be at least 8 characters'); return; }
    const d = await api('signup', {
      firstName: f.firstName, lastName: f.lastName, email: f.email, phone: f.phone,
      companyName: f.company, password: f.password, primaryPlatform: f.platform, heardFrom: f.heardFrom,
    });
    if (d?.ok) { setMsg(`Code sent to ${f.email}`); setView('otp'); }
  }
  async function doVerify(purpose) {
    const code = f.otp.join('');
    if (code.length !== 6) { setErr('Enter the 6-digit code'); return; }
    const d = await api('verify-otp', { email: f.email, code, purpose });
    if (!d) return;
    if (purpose === 'signup' && d.accessToken) { saveTokens(d); window.location.href = '/dashboard'; }
    if (purpose === 'reset' && d.resetTicket) { setResetTicket(d.resetTicket); setView('newpass'); }
  }
  async function doForgot() {
    const d = await api('forgot', { email: f.email });
    if (d?.ok) { setMsg('If the email exists, a code was sent'); setView('otp'); }
  }
  async function doReset() {
    if (f.newPass.length < 8 || f.newPass !== f.newPass2) { setErr('Passwords must match (min 8 chars)'); return; }
    const d = await api('reset', { resetTicket, newPassword: f.newPass });
    if (d?.accessToken) { saveTokens(d); window.location.href = '/dashboard'; }
  }
  function saveTokens(d) {
    try {
      document.cookie = `ots_token=${d.accessToken}; path=/; max-age=900`;
      // note: refresh token would go httpOnly in production
    } catch {}
  }
  function otpInput(i, v) {
    if (!/^\d?$/.test(v)) return;
    const arr = [...f.otp]; arr[i] = v; set('otp', arr);
    if (v && i < 5) document.getElementById(`otp${i + 1}`)?.focus();
  }
  function otpPaste(e) {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const arr = ['', '', '', '', '', ''];
    for (let j = 0; j < text.length; j++) arr[j] = text[j];
    set('otp', arr);
    const last = Math.min(text.length, 6) - 1;
    document.getElementById(`otp${last}`)?.focus();
  }
 
  return (
    <div style={S.wrap}>
      {/* LEFT brand panel */}
      <div style={S.left}>
        <div>
          <div style={S.brand}>
            <span style={S.mark}><Logo /></span>OTS <em style={{ fontStyle: 'normal', color: '#60A5FA' }}>Desk</em>
          </div>
          <div style={S.tag}>Track · Manage · Profit</div>
        </div>
        <div>
          <h1 style={S.h1}>Every order, every cost,<br /><span style={{ color: '#60A5FA' }}>every dollar of profit.</span></h1>
          <p style={S.lead}>The all-in-one order management and profit tracking system built for marketplace sellers.</p>
          <div style={{ marginTop: 24, display: 'grid', gap: 10 }}>
            {['Auto profit & margin formulas that never break', 'Live dashboard — sales, refunds, fees, net profit', 'Import marketplace sheets, export custom reports'].map((t, i) => (
              <div key={i} style={S.point}><span style={S.dot} />{t}</div>
            ))}
          </div>
        </div>
        <div style={{ color: '#5B7290', fontSize: 12 }}>© 2026 OTS Desk · HZ Creations Ltd</div>
      </div>
 
      {/* RIGHT form panel */}
      <div style={S.right}>
        <div style={{ width: 360, maxWidth: '100%' }}>
          {view === 'login' && (
            <>
              <h2 style={S.h2}>Welcome back</h2>
              <p style={S.sub}>Sign in to your OTS Desk account</p>
              <Field label="Email address"><input style={S.input} type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" /></Field>
              <Field label="Password"><input style={S.input} type="password" value={f.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && doLogin()} /></Field>
              <Btn onClick={doLogin} loading={loading}>Sign in</Btn>
              <Err e={err} />
              <p style={S.alt}><a style={S.link} onClick={() => { setErr(''); setView('forgot'); }}>Forgot password?</a></p>
              <p style={S.alt}>New to OTS Desk? <a style={S.link} onClick={() => { setErr(''); setView('signup'); }}>Create an account</a></p>
            </>
          )}
 
          {view === 'signup' && (
            <>
              <h2 style={S.h2}>Create your account</h2>
              <p style={S.sub}>1-month free trial · then $9.99/month</p>
              <div style={S.row2}>
                <Field label="First name"><input style={S.input} value={f.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" /></Field>
                <Field label="Last name"><input style={S.input} value={f.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Doe" /></Field>
              </div>
              <Field label="Email address"><input style={S.input} type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" /></Field>
              <Field label="Phone number"><input style={S.input} value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 1234" /></Field>
              <Field label="Company name (optional)"><input style={S.input} value={f.company} onChange={e => set('company', e.target.value)} placeholder="Your LLC / brand" /></Field>
              <div style={S.row2}>
                <Field label="Primary platform">
                  <select style={S.input} value={f.platform} onChange={e => set('platform', e.target.value)}>
                    {['Walmart', 'Amazon', 'eBay', 'TikTok Shop', 'Etsy', 'Shopify', 'Other'].map(x => <option key={x}>{x}</option>)}
                  </select>
                </Field>
                <Field label="Heard about us?">
                  <select style={S.input} value={f.heardFrom} onChange={e => set('heardFrom', e.target.value)}>
                    {['Google', 'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Friend / Referral', 'Other'].map(x => <option key={x}>{x}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Create password"><input style={S.input} type="password" value={f.password} onChange={e => set('password', e.target.value)} placeholder="Minimum 8 characters" /></Field>
              <Btn onClick={doSignup} loading={loading}>Continue — verify email</Btn>
              <Err e={err} />
              <p style={S.alt}>Already have an account? <a style={S.link} onClick={() => { setErr(''); setView('login'); }}>Sign in</a></p>
            </>
          )}
 
          {view === 'otp' && (
            <>
              <h2 style={S.h2}>Verify your email</h2>
              <p style={S.sub}>{msg || `Enter the 6-digit code sent to ${f.email}`}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', margin: '18px 0' }}>
                {f.otp.map((v, i) => (
                  <input key={i} id={`otp${i}`} style={S.otp} maxLength={1} value={v}
                    onChange={e => otpInput(i, e.target.value)} onPaste={otpPaste} inputMode="numeric" />
                ))}
              </div>
              <Btn onClick={() => doVerify(resetTicket || view === 'forgot' ? 'reset' : (f.password ? 'signup' : 'reset'))} loading={loading}>Verify &amp; continue</Btn>
              <Err e={err} />
              <p style={S.alt}><a style={S.link} onClick={() => setView('login')}>Back to sign in</a></p>
            </>
          )}
 
          {view === 'forgot' && (
            <>
              <h2 style={S.h2}>Reset password</h2>
              <p style={S.sub}>Enter your email — we'll send a reset code</p>
              <Field label="Email address"><input style={S.input} type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" /></Field>
              <Btn onClick={doForgot} loading={loading}>Send reset code</Btn>
              <Err e={err} />
              <p style={S.alt}><a style={S.link} onClick={() => setView('login')}>Back to sign in</a></p>
            </>
          )}
 
          {view === 'newpass' && (
            <>
              <h2 style={S.h2}>Set new password</h2>
              <p style={S.sub}>Email verified ✓ — choose your new password</p>
              <Field label="New password"><input style={S.input} type="password" value={f.newPass} onChange={e => set('newPass', e.target.value)} placeholder="Minimum 8 characters" /></Field>
              <Field label="Confirm password"><input style={S.input} type="password" value={f.newPass2} onChange={e => set('newPass2', e.target.value)} placeholder="Repeat password" /></Field>
              <Btn onClick={doReset} loading={loading}>Save password &amp; sign in</Btn>
              <Err e={err} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
 
function Logo() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>; }
function Field({ label, children }) { return <div style={{ marginBottom: 14 }}><label style={S.label}>{label}</label>{children}</div>; }
function Btn({ onClick, loading, children }) { return <button style={{ ...S.btn, opacity: loading ? .6 : 1 }} onClick={onClick} disabled={loading}>{loading ? 'Please wait…' : children}</button>; }
function Err({ e }) { return e ? <p style={{ color: 'var(--red)', fontSize: 12.5, marginTop: 8 }}>{e}</p> : null; }
 
const S = {
  wrap: { minHeight: '100vh', display: 'flex' },
  left: { flex: 1, background: 'linear-gradient(160deg,#0D1B2A 0%,#13263B 55%,#1E3A8A 130%)', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 48 },
  brand: { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 20 },
  mark: { width: 38, height: 38, borderRadius: 10, background: '#2563EB', display: 'grid', placeItems: 'center' },
  tag: { marginTop: 8, fontSize: 12, color: '#93C5FD', letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 600 },
  h1: { fontSize: 32, lineHeight: 1.2, fontWeight: 700, maxWidth: 420 },
  lead: { marginTop: 14, color: '#B6C6DB', maxWidth: 400, fontSize: 14, lineHeight: 1.7 },
  point: { display: 'flex', gap: 10, alignItems: 'center', color: '#DBEAFE', fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#10B981', flex: 'none' },
  right: { width: 480, maxWidth: '100%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 },
  h2: { fontSize: 22, fontWeight: 700 },
  sub: { color: '#64748B', margin: '6px 0 22px', fontSize: 12.5 },
  label: { display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 6 },
  input: { width: '100%', padding: '11px 13px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  btn: { width: '100%', border: 'none', borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 600, background: '#2563EB', color: '#fff', cursor: 'pointer', marginTop: 4 },
  otp: { width: 48, height: 54, textAlign: 'center', fontSize: 20, fontWeight: 700, border: '1.5px solid #E2E8F0', borderRadius: 10, outline: 'none' },
  alt: { textAlign: 'center', marginTop: 16, fontSize: 12.5, color: '#64748B' },
  link: { color: '#2563EB', fontWeight: 600, cursor: 'pointer' },
};
