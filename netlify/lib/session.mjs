// 로그인 쿠키(sc_session) 읽기 — auth.mjs 와 같은 HMAC 서명 확인. 다른 함수(타로 등)에서 회원을 알아볼 때 씀.
import { createHmac, timingSafeEqual } from 'node:crypto';

export function sessionOf(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const raw = (req.headers.get('cookie') || '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('sc_session='));
  if (!raw) return null;
  const token = decodeURIComponent(raw.slice('sc_session='.length));
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const want = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
