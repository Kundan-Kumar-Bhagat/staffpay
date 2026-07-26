import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Token from '../models/Token.js';
import { sendMail } from '../services/mail.service.js';
import { logActivity } from '../utils/log.js';
const gclient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const hash = s => crypto.createHash('sha256').update(s).digest('hex');

const issueTokens = (user, remember) => ({
  access: jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: remember ? '7d' : '1d' }),
  refresh: jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: remember ? '30d' : '1d' }),
  user: user.toJSON(),
});

const nextEmpId = async () => `EMP-${String((await User.countDocuments()) + 1).padStart(3, '0')}`;

export const register = async (req, res) => {
  const { name, email, phone, password, remember } = req.body;
  if (!name || !password || password.length < 6) return res.status(400).json({ message: 'Name and a 6+ character password are required' });
  if (!email && !phone) return res.status(400).json({ message: 'Email or phone is required' });
  if (email && await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'Email already registered' });
  if (phone && await User.findOne({ phone })) return res.status(409).json({ message: 'Phone already registered' });
  const first = (await User.countDocuments()) === 0;
  const user = await User.create({ name, email, phone, password, role: first ? 'admin' : 'staff', employeeId: await nextEmpId() });
  res.status(201).json(issueTokens(user, !!remember));
};

export const login = async (req, res) => {
  const { id, password, remember } = req.body;
  const user = await User.findOne({ $or: [{ email: (id || '').toLowerCase() }, { phone: id }] }).select('+password');
  if (!user || !user.password || !(await user.match(password))) return res.status(401).json({ message: 'Invalid credentials' });
  if (user.status !== 'active') return res.status(403).json({ message: 'Account is deactivated — contact admin' });
  logActivity(user, 'login', 'signed in');
  res.json(issueTokens(user, !!remember));
};

export const googleLogin = async (req, res) => {
  let payload;
  try {
    const ticket = await gclient.verifyIdToken({ idToken: req.body.credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch { return res.status(401).json({ message: 'Invalid Google credential' }); }
  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email }] });
  if (!user) user = await User.create({ name: payload.name || payload.email, email: payload.email, googleId: payload.sub, role: 'staff', employeeId: await nextEmpId() });
  if (user.status !== 'active') return res.status(403).json({ message: 'Account is deactivated' });
  res.json(issueTokens(user, true));
};

export const phoneRequest = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone number required' });
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await Token.create({ type: 'otp', identifier: phone, token: hash(otp), expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
  let sent = false;
  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
    try {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_TOKEN}`).toString('base64') },
        body: new URLSearchParams({ From: process.env.TWILIO_FROM, To: phone, Body: `Your StaffPay login OTP is ${otp}. Valid for 5 minutes.` }),
      });
      sent = true;
    } catch (e) { console.error('SMS failed:', e.message); }
  }
  res.json({ message: sent ? 'OTP sent via SMS' : 'OTP generated (add Twilio keys for real SMS)', devOtp: process.env.NODE_ENV === 'production' ? undefined : otp });
};

export const phoneVerify = async (req, res) => {
  const { phone, otp, name } = req.body;
  const tok = await Token.findOne({ type: 'otp', identifier: phone }).sort('-createdAt');
  if (!tok || tok.used || tok.expiresAt < new Date() || tok.token !== hash(otp || '')) return res.status(400).json({ message: 'Invalid or expired OTP' });
  tok.used = true; await tok.save();
  let user = await User.findOne({ phone });
  if (!user) user = await User.create({ name: name || `Staff ${phone.slice(-4)}`, phone, role: 'staff', employeeId: await nextEmpId() });
  if (user.status !== 'active') return res.status(403).json({ message: 'Account is deactivated' });
  res.json(issueTokens(user, true));
};

export const forgot = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user) return res.status(404).json({ message: 'No account with this email' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await Token.create({ type: 'reset', identifier: email.toLowerCase(), token: hash(code), expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
  const sent = await sendMail({
    to: email,
    subject: 'StaffPay — password reset code',
    text: `Your password reset code is ${code}. It expires in 15 minutes. If you didn't request this, ignore this email.`,
    html: `<div style="font-family:Arial;padding:24px;max-width:480px;margin:auto;border:1px solid #D8DED9;border-radius:10px">
      <h2 style="color:#0F3D33">Password reset</h2>
      <p>Use this code to reset your StaffPay password:</p>
      <p style="font-family:monospace;font-size:28px;letter-spacing:6px;background:#EEF3EF;padding:12px;border-radius:8px;color:#0F3D33">${code}</p>
      <p style="color:#5B6B64;font-size:13px">Expires in 15 minutes. If you didn't request this, ignore this email.</p>
    </div>`,
  });
  res.json({ message: sent ? 'Reset code sent to your email' : 'Reset code issued (SMTP not configured)', devToken: process.env.NODE_ENV === 'production' ? undefined : code });
};

export const reset = async (req, res) => {
  const { email, token, password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be 6+ characters' });
  const t = await Token.findOne({ type: 'reset', identifier: (email || '').toLowerCase() }).sort('-createdAt');
  if (!t || t.used || t.expiresAt < new Date() || t.token !== hash(token || '')) return res.status(400).json({ message: 'Invalid or expired code' });
  t.used = true; await t.save();
  const user = await User.findOne({ email: email.toLowerCase() });
  user.password = password; await user.save();
  res.json({ message: 'Password reset — please sign in' });
};

export const refresh = async (req, res) => {
  try {
    const { id } = jwt.verify(req.body.refresh, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(id);
    if (!user || user.status !== 'active') throw new Error();
    res.json({ access: jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' }) });
  } catch { res.status(401).json({ message: 'Invalid refresh token' }); }
};

export const me = (req, res) => res.json(req.user);

export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'New password must be 6+ characters' });
  const user = await User.findById(req.user._id).select('+password');
  if (user.password && !(await user.match(oldPassword || ''))) return res.status(400).json({ message: 'Current password is incorrect' });
  user.password = newPassword; await user.save();
  res.json({ message: 'Password updated' });
};