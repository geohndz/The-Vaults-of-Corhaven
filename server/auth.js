/* Cookie gate for /dashboard. The password lives in DASHBOARD_PASSWORD.
   Production without a password hides the page so it cannot sit open. */
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from './http.js';

const COOKIE = 'corhaven_dash';
const WEEK = 14 * 24 * 3600;
const NAME = 'v1';

export function passwordSet() { return !!String(process.env.DASHBOARD_PASSWORD || '').length; }
export function hideDashboard() { return process.env.VERCEL_ENV === 'production' && !passwordSet(); }
export function authRequired() { return passwordSet(); }

function secret() { return String(process.env.DASHBOARD_PASSWORD || 'local-open'); }

function digest(s) { return createHash('sha256').update(s).digest(); }
function same(a, b) {
  const ha = digest(String(a)), hb = digest(String(b));
  return ha.length === hb.length && timingSafeEqual(ha, hb);
}

function sign(exp) {
  return createHmac('sha256', secret()).update(NAME + '.' + exp).digest('hex');
}

export function mintCookie() {
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  const token = NAME + '.' + exp + '.' + sign(exp);
  const secure = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return COOKIE + '=' + token + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + WEEK + secure;
}

export function clearCookie() {
  const secure = process.env.VERCEL_ENV === 'production' ? '; Secure' : '';
  return COOKIE + '=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' + secure;
}

export function checkPassword(given) { return passwordSet() && same(given, process.env.DASHBOARD_PASSWORD); }

export function isAuthed(req) {
  if (!authRequired()) return true;
  const token = cookies(req)[COOKIE];
  if (!token) return false;
  const parts = String(token).split('.');
  if (parts.length !== 3 || parts[0] !== NAME) return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  return same(parts[2], sign(exp));
}
