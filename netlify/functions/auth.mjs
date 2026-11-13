// 카카오 로그인 (Netlify Function, 서버에서만 실행) — 2026-11-13
// - /api/auth/kakao/login    → 카카오 인가 화면으로 보냄 (state 쿠키로 위조 요청 방지)
// - /api/auth/kakao/callback → 인가 코드로 토큰을 받아 회원번호·닉네임만 확인 → 서명한 세션 쿠키 발급 → 원래 화면으로
// - /api/auth/me             → { enabled, user }  (user: { nick } 또는 null)
// - /api/auth/logout         → 세션 쿠키 삭제
// - /api/auth/delete         → 회원 탈퇴: 저장된 회원 정보 삭제 + 세션 쿠키 삭제
// - /api/admin/users         → 관리자용 회원 목록 (Authorization: Bearer ADMIN_PASSWORD)
// 카카오 액세스 토큰은 쓰고 바로 버린다(저장 안 함). 로그인 상태는 HttpOnly 쿠키, 회원 목록은 Netlify Blobs(users)에
// 회원번호·닉네임·가입일·마지막 로그인·로그인 횟수만 저장 (2026-11-13).
// 환경 변수: KAKAO_REST_API_KEY(필수), KAKAO_CLIENT_SECRET(카카오 앱에서 켰다면), SESSION_SECRET(필수, 긴 무작위 문자열),
//           ADMIN_PASSWORD(관리자 회원 목록 보기용, 없으면 관리자 목록 꺼짐)
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { createRateLimiter } from '../lib/guard.mjs';

const SESSION = 'sc_session';
const STATE = 'sc_oauth';
const SESSION_DAYS = 30;
const users = () => getStore('users');
// 관리자 비밀번호 대입 막기: 같은 IP 는 10분에 5번까지만 시도
const adminLimited = createRateLimiter(5, 10 * 60_000);

// 로그인할 때 회원 정보 저장·갱신 → 처음이면 true
async function upsertUser(id, nick) {
  const store = users();
  const now = new Date().toISOString();
  const prev = await store.get(id, { type: 'json' });
  await store.setJSON(id, {
    id,
    nick,
    joinedAt: prev?.joinedAt || now,
    lastLoginAt: now,
    loginCount: (prev?.loginCount || 0) + 1,
  });
  return !prev;
}

function sameSecret(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}

const b64 = (s) => Buffer.from(s).toString('base64url');
const unb64 = (s) => Buffer.from(s, 'base64url').toString();

function sign(payload, secret) {
  const body = b64(JSON.stringify(payload));
  const mac = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}
function verify(token, secret) {
  if (!token || !secret) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const want = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(unb64(body));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function cookies(req) {
  return Object.fromEntries(
    (req.headers.get('cookie') || '')
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );
}
const setCookie = (name, value, maxAge) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// 로그인 뒤 돌아갈 주소: 같은 사이트 안의 경로만 허용 (외부로 튀는 것 막기)
const safeNext = (n) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n.slice(0, 300) : '/');

function redirect(location, setCookies = []) {
  const headers = new Headers({ location, 'cache-control': 'no-store' });
  setCookies.forEach((c) => headers.append('set-cookie', c));
  return new Response(null, { status: 302, headers });
}
const json = (data, status = 200, setCookies = []) => {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  setCookies.forEach((c) => headers.append('set-cookie', c));
  return new Response(JSON.stringify(data), { status, headers });
};

export default async (req, context) => {
  const url = new URL(req.url);
  const key = process.env.KAKAO_REST_API_KEY;
  const secret = process.env.SESSION_SECRET;
  const enabled = Boolean(key && secret);
  const redirectUri = `${url.origin}/api/auth/kakao/callback`;
  const path = url.pathname;

  if (path === '/api/auth/me') {
    const s = verify(cookies(req)[SESSION], secret);
    if (!s) return json({ enabled, user: null });
    // 마이페이지용: ?full=1 이면 저장된 회원 정보(가입일·마지막 로그인·횟수)도 함께
    let profile = null;
    if (url.searchParams.get('full') === '1') {
      try {
        profile = await users().get(s.sub, { type: 'json' });
      } catch (e) {
        console.error('profile read failed:', e?.name);
      }
    }
    return json({
      enabled,
      user: { nick: s.nick || '', ...(profile ? { joinedAt: profile.joinedAt, lastLoginAt: profile.lastLoginAt, loginCount: profile.loginCount } : {}) },
    });
  }

  if (path === '/api/auth/logout') {
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    return json({ ok: true }, 200, [setCookie(SESSION, '', 0)]);
  }

  if (path === '/api/auth/delete') {
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    const s = verify(cookies(req)[SESSION], secret);
    if (!s) return json({ error: '로그인 정보가 없어요.' }, 401);
    try {
      await users().delete(s.sub);
    } catch (e) {
      console.error('user delete failed:', e?.name);
      return json({ error: '탈퇴하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }, 500);
    }
    return json({ ok: true }, 200, [setCookie(SESSION, '', 0)]);
  }

  if (path === '/api/admin/users') {
    const admin = process.env.ADMIN_PASSWORD;
    const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!admin) return json({ error: '관리자 비밀번호가 설정되지 않았어요.' }, 503);
    const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
    if (adminLimited(ip)) return json({ error: '시도가 너무 많아요. 10분 뒤 다시 해 주세요.' }, 429);
    if (!sameSecret(given, admin)) return json({ error: '비밀번호가 맞지 않아요.' }, 401);
    const store = users();
    const { blobs } = await store.list();
    const list = (await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })))).filter(Boolean);
    list.sort((a, b) => String(b.lastLoginAt).localeCompare(String(a.lastLoginAt)));
    return json({ total: list.length, users: list });
  }

  if (path === '/api/auth/kakao/login') {
    if (!enabled) return redirect('/?login=unavailable');
    const state = randomBytes(16).toString('hex');
    const next = safeNext(url.searchParams.get('next'));
    const auth = new URL('https://kauth.kakao.com/oauth/authorize');
    auth.searchParams.set('client_id', key);
    auth.searchParams.set('redirect_uri', redirectUri);
    auth.searchParams.set('response_type', 'code');
    auth.searchParams.set('state', state);
    return redirect(auth.toString(), [setCookie(STATE, `${state}|${next}`, 600)]);
  }

  if (path === '/api/auth/kakao/callback') {
    const [savedState, next = '/'] = (cookies(req)[STATE] || '').split('|');
    const clearState = setCookie(STATE, '', 0);
    const fail = (why) => {
      console.error('kakao login failed:', why);
      return redirect(`${safeNext(next)}${safeNext(next).includes('?') ? '&' : '?'}login=fail`, [clearState]);
    };
    if (!enabled) return redirect('/?login=unavailable', [clearState]);
    if (url.searchParams.get('error')) return redirect(safeNext(next), [clearState]); // 사용자가 동의 화면에서 취소
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state || !savedState || state !== savedState) return fail('state');

    try {
      const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: key, redirect_uri: redirectUri, code });
      if (process.env.KAKAO_CLIENT_SECRET) body.set('client_secret', process.env.KAKAO_CLIENT_SECRET);
      const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body,
      });
      if (!tokenRes.ok) return fail(`token ${tokenRes.status}`);
      const { access_token: accessToken } = await tokenRes.json();
      const meRes = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
      });
      if (!meRes.ok) return fail(`me ${meRes.status}`);
      const me = await meRes.json();
      const nick = me?.kakao_account?.profile?.nickname || '';
      const id = String(me.id);
      let isNew = false;
      try {
        isNew = await upsertUser(id, nick.slice(0, 40));
      } catch (e) {
        console.error('user save failed:', e?.name); // 저장이 안 돼도 로그인은 진행
      }
      const session = sign({ sub: id, nick: nick.slice(0, 40), exp: Date.now() + SESSION_DAYS * 86400000 }, secret);
      const dest = safeNext(next);
      // 화면에서 GA 이벤트(sign_up / login)를 보내도록 표시만 붙임 (개인 정보 없음)
      return redirect(`${dest}${dest.includes('?') ? '&' : '?'}login=${isNew ? 'new' : 'ok'}`, [clearState, setCookie(SESSION, session, SESSION_DAYS * 86400)]);
    } catch (e) {
      return fail(e?.name || 'error');
    }
  }

  return json({ error: '없는 주소예요.' }, 404);
};

export const config = { path: ['/api/auth/kakao/login', '/api/auth/kakao/callback', '/api/auth/me', '/api/auth/logout', '/api/auth/delete', '/api/admin/users'] };
