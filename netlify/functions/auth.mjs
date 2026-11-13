// 카카오·이메일 로그인 (Netlify Function, 서버에서만 실행) — 2026-11-13
// - /api/auth/email/signup   → 이메일 가입 신청(이메일·비밀번호·닉네임) → 인증 메일(Resend)
// - /api/auth/email/verify   → 메일 링크: 인증 + 가입 완료 + 로그인 → /?login=new&via=email
// - /api/auth/email/login    → 이메일·비밀번호 로그인 (비밀번호는 scrypt 해시로만 저장, keep=false 면 자동 로그인 안 함)
// - /api/auth/email/reset-request → 비밀번호 찾기: 재설정 메일(1시간) / email/reset → 새 비밀번호 저장 + 로그인 (화면 /reset)
// - /api/auth/email/password → 마이페이지 비밀번호 변경 (지금 비밀번호 확인 후 저장, 이메일 회원만)
// - /api/auth/kakao/login    → 카카오 인가 화면으로 보냄 (state 쿠키로 위조 요청 방지)
// - /api/auth/kakao/callback → 인가 코드로 토큰을 받아 회원번호·닉네임만 확인 → 서명한 세션 쿠키 발급 → 원래 화면으로
// - /api/auth/me             → { enabled, user }  (user: { nick } 또는 null)
// - /api/auth/logout         → 세션 쿠키 삭제
// - /api/auth/nickname       → 사이트 닉네임 변경 (중복 금지) / nickname/suggest → 비어 있는 랜덤 닉네임
// - /api/auth/birth          → 내 사주 정보 저장(POST)·삭제(DELETE) — 마이페이지
// - /api/auth/delete         → 회원 탈퇴: 저장된 회원 정보 삭제 + 세션 쿠키 삭제
// - /api/inquiry             → 문의 남기기(POST)·내 문의내역(GET), 로그인 회원만
// - /api/admin/users         → 관리자용 회원 목록 + 문의 목록 (Authorization: Bearer ADMIN_PASSWORD)
// - /api/admin/inquiry       → 관리자 문의 답변 저장
// 카카오 액세스 토큰은 쓰고 바로 버린다(저장 안 함). 로그인 상태는 HttpOnly 쿠키, 회원 목록은 Netlify Blobs(users)에
// 회원번호·닉네임·가입일·마지막 로그인·로그인 횟수만 저장 (2026-11-13).
// 환경 변수: KAKAO_REST_API_KEY(필수), KAKAO_CLIENT_SECRET(카카오 앱에서 켰다면), SESSION_SECRET(필수, 긴 무작위 문자열),
//           ADMIN_PASSWORD(관리자 회원 목록 보기용, 없으면 관리자 목록 꺼짐),
//           RESEND_API_KEY·MAIL_FROM(이메일 가입 인증 메일, 없으면 이메일 가입·로그인 꺼짐)
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { createRateLimiter } from '../lib/guard.mjs';
import { computeSaju, SajuInputError } from '../../src/lib/saju.js';
import { passwordOk } from '../../src/lib/password.js';

const SESSION = 'sc_session';
const STATE = 'sc_oauth';
const SESSION_DAYS = 30;
const users = () => getStore('users');
// 관리자 비밀번호 대입 막기: 같은 IP 는 10분에 5번까지만 시도
const adminLimited = createRateLimiter(5, 10 * 60_000);
// 답변 달기처럼 연달아 부르는 관리자 요청용: 틀린 비밀번호만 세서 10분에 5번 넘으면 막음
const adminFails = new Map();
function adminAuth(req, ip) {
  const admin = process.env.ADMIN_PASSWORD;
  if (!admin) return { error: '관리자 비밀번호가 설정되지 않았어요.', status: 503 };
  const now = Date.now();
  const fails = (adminFails.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  if (fails.length >= 5) return { error: '시도가 너무 많아요. 10분 뒤 다시 해 주세요.', status: 429 };
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!sameSecret(given, admin)) {
    adminFails.set(ip, [...fails, now]);
    return { error: '비밀번호가 맞지 않아요.', status: 401 };
  }
  return null;
}

// ── 문의 (2026-11-13, 로그인 회원만) ──
// Netlify Blobs 'inquiries': 키 = 회원번호/문의번호, 값 = { id, userId, nick, type, company, email, message, page, createdAt, answer, answeredAt }
// 알림 메일은 화면이 Netlify Forms(contact)에도 같이 보내서 받음. 탈퇴하면 그 회원의 문의도 지움.
const inquiries = () => getStore('inquiries');
const INQUIRY_TYPES = { site: '이용 문의', error: '풀이·계산 오류 신고', ad: '제휴·광고 제안', etc: '기타' };
const inquiryLimited = createRateLimiter(5, 10 * 60_000); // 같은 회원 10분 5건
async function listInquiries(prefix) {
  const store = inquiries();
  const { blobs } = await store.list(prefix ? { prefix } : undefined);
  const list = (await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })))).filter(Boolean);
  return list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

// ── 이메일 회원 (2026-11-13) ──
// emails: 키 = 정규화한 이메일, 값 = 회원번호(e_…) / pending: 키 = 인증 토큰, 값 = 가입 대기 정보(24시간)
const emails = () => getStore('emails');
const pending = () => getStore('pending');
const emailKey = (e) => encodeURIComponent(String(e).trim().toLowerCase());
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const signupLimited = createRateLimiter(5, 10 * 60_000); // 같은 IP 10분 5번
const loginLimited = createRateLimiter(10, 10 * 60_000); // 같은 IP 10분 10번
function hashPassword(pw) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${scryptSync(pw, salt, 64).toString('base64')}`;
}
function checkPassword(pw, stored) {
  const [kind, salt, hash] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const a = scryptSync(String(pw), Buffer.from(salt, 'base64'), 64);
  const b = Buffer.from(hash, 'base64');
  return a.length === b.length && timingSafeEqual(a, b);
}
// 비밀번호 규칙은 화면과 같은 src/lib/password.js (영문/숫자/특수문자 중 2가지, 8~32자 공백 없음, 같은 글자 3번 연속 금지)
function passwordError(pw) {
  return passwordOk(pw) ? '' : '비밀번호 조건을 모두 맞춰 주세요.';
}
// 메일 보내기 (Resend). 환경 변수: RESEND_API_KEY, MAIL_FROM (예: 사주천문 <noreply@xn--z92bt3ho9hczd.com>)
// 메일은 라이트 모드(흰 배경). 받은편지함이 다크로 바꾸지 않게 color-scheme 을 light 로 고정
async function sendMail(to, { subject, title, lines, button, link, ignore }) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;background:#ffffff;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif">
<div style="max-width:480px;margin:0 auto;padding:40px 24px;color:#171719;background:#ffffff">
<p style="margin:0 0 6px;color:#a8862f;font-size:14px">사주천문</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#171719">${title}</h1>
<p style="margin:0 0 24px;color:#46474c;font-size:15px;line-height:1.7">${lines.join('<br>')}</p>
<a href="${link}" style="display:inline-block;padding:14px 28px;border-radius:12px;background:#e2c27a;color:#1b1c1e;font-size:16px;font-weight:600;text-decoration:none">${button}</a>
<p style="margin:28px 0 0;color:#878a93;font-size:13px;line-height:1.6">${ignore}</p>
</div></body></html>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error(`resend ${r.status}`);
}
const sendVerifyMail = (to, link) =>
  sendMail(to, {
    subject: '[사주천문] 회원가입 이메일 인증',
    title: '이메일 인증을 마쳐 주세요',
    lines: ['아래 버튼을 누르면 인증이 끝나고 바로 가입돼요.', '이 링크는 24시간 동안만 쓸 수 있어요.'],
    button: '이메일 인증하기',
    link,
    ignore: '직접 가입하지 않았다면 이 메일은 무시해 주세요. 아무 일도 일어나지 않아요.',
  });
const sendResetMail = (to, link) =>
  sendMail(to, {
    subject: '[사주천문] 비밀번호 재설정',
    title: '비밀번호를 새로 정해 주세요',
    lines: ['아래 버튼을 눌러 새 비밀번호를 정하면 바로 로그인돼요.', '이 링크는 1시간 동안 한 번만 쓸 수 있어요.'],
    button: '비밀번호 새로 정하기',
    link,
    ignore: '직접 요청하지 않았다면 이 메일은 무시해 주세요. 비밀번호는 그대로예요.',
  });
const resetLimited = createRateLimiter(5, 10 * 60_000); // 같은 IP 10분 5번

// ── 사이트 닉네임 (중복 금지 — 나중에 커뮤니티·랭킹에 보일 이름, 2026-11-13) ──
// 닉네임 주인 목록: Netlify Blobs 'nicknames' (키 = 비교용으로 정규화한 닉네임, 값 = 회원번호)
const nicknames = () => getStore('nicknames');
const nickKey = (n) => encodeURIComponent(String(n).replace(/\s+/g, '').toLowerCase());
// 랜덤 닉네임: 천둥의 + 단어 + 1~99 (예: 천둥의 별빛 37)
const NICK_WORDS = [
  '별빛', '달빛', '구름', '바람', '이슬', '노을', '새벽', '은하', '샛별', '무지개', '소나기', '안개', '햇살', '물결', '초승달',
  '보름달', '반딧불', '꽃잎', '단풍', '눈꽃', '하늘', '기운', '부적', '도사', '여우', '호랑이', '두꺼비', '학', '거북', '복주머니',
];
const randomNick = () => `천둥의 ${NICK_WORDS[Math.floor(Math.random() * NICK_WORDS.length)]} ${1 + Math.floor(Math.random() * 99)}`;
// 아무도 안 쓰는 랜덤 닉네임 (여러 번 시도, 그래도 겹치면 숫자를 늘림)
async function freeRandomNick(store = nicknames()) {
  for (let i = 0; i < 12; i++) {
    const n = i < 10 ? randomNick() : `${randomNick()}${Math.floor(Math.random() * 900) + 100}`;
    if (!(await store.get(nickKey(n)))) return n;
  }
  return `천둥의 손님 ${Date.now() % 100000}`;
}
// 닉네임을 이 회원 것으로 등록 (다른 사람이 쓰고 있으면 false). 예전 닉네임은 풀어 줌
async function claimNick(id, nick, oldNick) {
  const store = nicknames();
  const owner = await store.get(nickKey(nick));
  if (owner && owner !== id) return false;
  await store.set(nickKey(nick), id);
  if (oldNick && nickKey(oldNick) !== nickKey(nick)) {
    const oldOwner = await store.get(nickKey(oldNick));
    if (oldOwner === id) await store.delete(nickKey(oldNick));
  }
  return true;
}

// 로그인할 때 회원 정보 저장·갱신. 기존 값(내 사주 정보 birth, 사이트 닉네임 displayNick)은 그대로 둠.
// 사이트 닉네임이 없으면(처음 가입 등) 카카오 이름(본명일 수 있음) 대신 겹치지 않는 랜덤 닉네임을 정해 줌
// → { isNew, displayNick }
async function upsertUser(id, nick) {
  const store = users();
  const now = new Date().toISOString();
  const prev = await store.get(id, { type: 'json' });
  const rec = {
    ...(prev || {}),
    id,
    provider: 'kakao',
    nick, // 카카오 닉네임(최신) — 관리자 목록 참고용, 화면에는 안 씀
    joinedAt: prev?.joinedAt || now,
    lastLoginAt: now,
    loginCount: (prev?.loginCount || 0) + 1,
  };
  if (!rec.displayNick) {
    for (let i = 0; i < 3 && !rec.displayNick; i++) {
      const n = await freeRandomNick();
      if (await claimNick(id, n)) rec.displayNick = n;
    }
  }
  await store.setJSON(id, rec);
  return { isNew: !prev, displayNick: rec.displayNick || nick };
}

// 사이트 닉네임 검사: 2~12자, 한글·영문·숫자·공백·일부 기호만
function cleanNick(v) {
  const n = String(v || '').replace(/\s+/g, ' ').trim();
  if ([...n].length < 2 || [...n].length > 12) return { error: '닉네임은 2~12자로 정해 주세요.' };
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 ._\-~♡★☆]+$/u.test(n)) return { error: '한글·영문·숫자와 . _ - ~ ♡ ★ 만 쓸 수 있어요.' };
  return { nick: n };
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
  // 로그인 쿠키. keep(자동 로그인)이면 30일 유지, 아니면 브라우저를 닫으면 사라지는 쿠키(서버 쪽 유효기간 1일)
  const sessionCookie = (sub, nick, keep = true) => {
    const value = sign({ sub, nick, keep, exp: Date.now() + (keep ? SESSION_DAYS * 86400000 : 86400000) }, secret);
    return keep ? setCookie(SESSION, value, SESSION_DAYS * 86400) : `${SESSION}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  };

  if (path === '/api/auth/me') {
    const s = verify(cookies(req)[SESSION], secret);
    const mailOn = Boolean(secret && process.env.RESEND_API_KEY && process.env.MAIL_FROM);
    if (!s) return json({ enabled, emailEnabled: mailOn, user: null });
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
      emailEnabled: mailOn,
      user: { nick: s.nick || '', provider: String(s.sub).startsWith('e_') ? 'email' : 'kakao', ...(profile ? { joinedAt: profile.joinedAt, lastLoginAt: profile.lastLoginAt, loginCount: profile.loginCount, birth: profile.birth || null, ...(profile.email ? { email: profile.email } : {}) } : {}) },
    });
  }

  // ── 이메일 회원가입: 정보 확인 → 가입 대기 저장 → 인증 메일 ──
  const emailEnabled = Boolean(secret && process.env.RESEND_API_KEY && process.env.MAIL_FROM);
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  const readJson = async () => {
    try {
      return await req.json();
    } catch {
      return null;
    }
  };

  if (path === '/api/auth/email/signup') {
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    if (!emailEnabled) return json({ error: '이메일 가입은 준비중이에요. 카카오로 가입해 주세요.' }, 503);
    if (signupLimited(ip)) return json({ error: '요청이 많아요. 10분 뒤 다시 시도해 주세요.' }, 429);
    const body = await readJson();
    const email = String(body?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 100) return json({ error: '이메일 주소를 확인해 주세요.', field: 'email' }, 400);
    const pwErr = passwordError(body?.password);
    if (pwErr) return json({ error: pwErr, field: 'password' }, 400);
    let nick = body?.nick ? cleanNick(body.nick) : { nick: await freeRandomNick() };
    if (nick.error) return json({ error: nick.error, field: 'nick' }, 400);
    nick = nick.nick;
    if (await emails().get(emailKey(email))) return json({ error: '이미 가입한 이메일이에요. 로그인해 주세요.', field: 'email' }, 409);
    if (await nicknames().get(nickKey(nick))) return json({ error: '이미 쓰고 있는 닉네임이에요. 다른 닉네임을 정해 주세요.', field: 'nick' }, 409);
    const token = randomBytes(32).toString('hex');
    await pending().setJSON(token, { email, passHash: hashPassword(body.password), nick, exp: Date.now() + 24 * 3600_000 });
    try {
      await sendVerifyMail(email, `${url.origin}/api/auth/email/verify?token=${token}`);
    } catch (e) {
      console.error('verify mail failed:', e?.message);
      await pending().delete(token);
      return json({ error: '인증 메일을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.' }, 502);
    }
    return json({ ok: true });
  }

  // 메일의 '이메일 인증하기' → 가입 완료 + 로그인 → 메인으로
  if (path === '/api/auth/email/verify') {
    const token = url.searchParams.get('token') || '';
    const p = /^[a-f0-9]{64}$/.test(token) ? await pending().get(token, { type: 'json' }) : null;
    if (!p || p.exp < Date.now()) {
      if (p) await pending().delete(token);
      return redirect('/?login=expired');
    }
    await pending().delete(token);
    if (await emails().get(emailKey(p.email))) return redirect('/?login=exists');
    const id = `e_${randomBytes(9).toString('hex')}`;
    let nick = p.nick;
    if (!(await claimNick(id, nick))) {
      nick = await freeRandomNick(); // 기다리는 사이 다른 사람이 같은 닉네임을 가져갔으면 랜덤으로
      await claimNick(id, nick);
    }
    const now = new Date().toISOString();
    await users().setJSON(id, { id, provider: 'email', email: p.email, passHash: p.passHash, displayNick: nick, joinedAt: now, lastLoginAt: now, loginCount: 1 });
    await emails().set(emailKey(p.email), id);
    return redirect('/?login=new&via=email', [sessionCookie(id, nick)]);
  }

  if (path === '/api/auth/email/login') {
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    if (!emailEnabled) return json({ error: '이메일 로그인은 준비중이에요. 카카오로 로그인해 주세요.' }, 503);
    if (loginLimited(ip)) return json({ error: '시도가 너무 많아요. 10분 뒤 다시 시도해 주세요.' }, 429);
    const body = await readJson();
    const email = String(body?.email || '').trim().toLowerCase();
    const fail = () => json({ error: '이메일 또는 비밀번호가 맞지 않아요.' }, 401);
    const id = EMAIL_RE.test(email) ? await emails().get(emailKey(email)) : null;
    if (!id) return fail();
    const rec = await users().get(id, { type: 'json' });
    if (!rec || !checkPassword(body?.password, rec.passHash)) return fail();
    rec.lastLoginAt = new Date().toISOString();
    rec.loginCount = (rec.loginCount || 0) + 1;
    await users().setJSON(id, rec);
    const nick = rec.displayNick || '사주천문 회원';
    return json({ ok: true, nick }, 200, [sessionCookie(id, nick, body?.keep !== false)]);
  }

  // 비밀번호 찾기: 가입한 이메일이면 재설정 링크(1시간)를 보냄. 가입 여부는 알려 주지 않음(항상 ok)
  if (path === '/api/auth/email/reset-request') {
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    if (!emailEnabled) return json({ error: '비밀번호 찾기는 준비중이에요.' }, 503);
    if (resetLimited(ip)) return json({ error: '요청이 많아요. 10분 뒤 다시 시도해 주세요.' }, 429);
    const body = await readJson();
    const email = String(body?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 100) return json({ error: '이메일 주소를 확인해 주세요.', field: 'email' }, 400);
    const id = await emails().get(emailKey(email));
    if (id) {
      const token = randomBytes(32).toString('hex');
      await pending().setJSON(`reset-${token}`, { id, exp: Date.now() + 3600_000 });
      try {
        await sendResetMail(email, `${url.origin}/reset?token=${token}`);
      } catch (e) {
        console.error('reset mail failed:', e?.message);
        await pending().delete(`reset-${token}`);
        return json({ error: '메일을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.' }, 502);
      }
    }
    return json({ ok: true });
  }

  // 새 비밀번호 저장 (POST {token, password}) → 바로 로그인
  if (path === '/api/auth/email/reset') {
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    if (!secret) return json({ error: '준비중이에요.' }, 503);
    const body = await readJson();
    const token = String(body?.token || '');
    const p = /^[a-f0-9]{64}$/.test(token) ? await pending().get(`reset-${token}`, { type: 'json' }) : null;
    if (!p || p.exp < Date.now()) {
      if (p) await pending().delete(`reset-${token}`);
      return json({ error: '링크가 만료됐어요. 비밀번호 찾기를 다시 해 주세요.', expired: true }, 400);
    }
    const pwErr = passwordError(body?.password);
    if (pwErr) return json({ error: pwErr, field: 'password' }, 400);
    const rec = await users().get(p.id, { type: 'json' });
    await pending().delete(`reset-${token}`);
    if (!rec) return json({ error: '탈퇴한 계정이에요.', expired: true }, 400);
    rec.passHash = hashPassword(body.password);
    rec.lastLoginAt = new Date().toISOString();
    rec.loginCount = (rec.loginCount || 0) + 1;
    await users().setJSON(p.id, rec);
    const nick = rec.displayNick || '사주천문 회원';
    return json({ ok: true, nick }, 200, [sessionCookie(p.id, nick)]);
  }

  // 비밀번호 변경 (마이페이지, 이메일 회원만): POST {current, password} — 지금 비밀번호를 확인한 뒤 새 비밀번호 저장
  if (path === '/api/auth/email/password') {
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    const s = verify(cookies(req)[SESSION], secret);
    if (!s) return json({ error: '로그인이 필요해요.' }, 401);
    if (!String(s.sub).startsWith('e_')) return json({ error: '카카오 회원은 비밀번호가 없어요.' }, 400);
    if (loginLimited(ip)) return json({ error: '시도가 너무 많아요. 10분 뒤 다시 시도해 주세요.' }, 429);
    const body = await readJson();
    const rec = await users().get(s.sub, { type: 'json' });
    if (!rec) return json({ error: '탈퇴한 계정이에요.' }, 400);
    if (!checkPassword(body?.current, rec.passHash)) return json({ error: '지금 비밀번호가 맞지 않아요.', field: 'current' }, 400);
    const pwErr = passwordError(body?.password);
    if (pwErr) return json({ error: pwErr, field: 'password' }, 400);
    if (body.password === body.current) return json({ error: '지금 비밀번호와 다른 비밀번호를 정해 주세요.', field: 'password' }, 400);
    rec.passHash = hashPassword(body.password);
    await users().setJSON(s.sub, rec);
    return json({ ok: true });
  }

  // 문의: POST = 문의 남기기 / GET = 내 문의내역 (로그인 회원만)
  if (path === '/api/inquiry') {
    const s = verify(cookies(req)[SESSION], secret);
    if (!s) return json({ error: '로그인이 필요해요.', login: true }, 401);
    if (req.method === 'GET') {
      const list = await listInquiries(`${s.sub}/`);
      return json({ inquiries: list.map(({ userId, ...q }) => q) });
    }
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    if (inquiryLimited(s.sub)) return json({ error: '문의가 많아요. 10분 뒤 다시 남겨 주세요.' }, 429);
    const body = await readJson();
    const type = INQUIRY_TYPES[body?.type] ? body.type : null;
    const message = String(body?.message || '').trim();
    const email = String(body?.email || '').trim();
    if (!type) return json({ error: '문의 유형을 골라 주세요.' }, 400);
    if (message.length < 10 || message.length > 2000) return json({ error: '문의 내용은 10자 이상 2000자 이하로 적어 주세요.' }, 400);
    if (email && (!EMAIL_RE.test(email) || email.length > 100)) return json({ error: '이메일 주소를 확인해 주세요.' }, 400);
    if (body?.consent !== true) return json({ error: '개인정보 수집·이용에 동의해 주세요.' }, 400);
    const id = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
    const q = {
      id,
      userId: s.sub,
      nick: s.nick || '',
      type,
      company: type === 'ad' ? String(body?.company || '').trim().slice(0, 60) : '',
      email,
      message,
      page: String(body?.page || '').slice(0, 300),
      createdAt: new Date().toISOString(),
      answer: '',
      answeredAt: null,
    };
    await inquiries().setJSON(`${s.sub}/${id}`, q);
    return json({ ok: true, id });
  }

  // 관리자: 문의 답변 저장 (POST {key, answer}) — (예전 문의에 이메일이 있으면 답변 알림 메일)
  if (path === '/api/admin/inquiry') {
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    const bad = adminAuth(req, ip);
    if (bad) return json({ error: bad.error }, bad.status);
    const body = await readJson();
    const key = String(body?.key || '');
    if (!/^[\w-]+\/[a-z0-9]+$/.test(key)) return json({ error: '잘못된 문의예요.' }, 400);
    const q = await inquiries().get(key, { type: 'json' });
    if (!q) return json({ error: '없는 문의예요. 회원이 탈퇴했을 수 있어요.' }, 404);
    const answer = String(body?.answer || '').trim().slice(0, 4000);
    const first = !q.answer && answer;
    q.answer = answer;
    q.answeredAt = answer ? new Date().toISOString() : null;
    await inquiries().setJSON(key, q);
    let mailed = false;
    if (first && q.email && emailEnabled) {
      try {
        await sendMail(q.email, {
          subject: '[사주천문] 문의에 답변했어요',
          title: '문의에 답변했어요',
          lines: [`남겨 주신 '${INQUIRY_TYPES[q.type] || '문의'}'에 답변을 달았어요.`, '마이페이지의 내 문의내역에서 확인해 주세요.'],
          button: '답변 확인하기',
          link: `${url.origin}/my/support`,
          ignore: '문의한 적이 없다면 이 메일은 무시해 주세요.',
        });
        mailed = true;
      } catch (e) {
        console.error('answer mail failed:', e?.message);
      }
    }
    return json({ ok: true, answeredAt: q.answeredAt, mailed });
  }

  if (path === '/api/auth/logout') {
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    return json({ ok: true }, 200, [setCookie(SESSION, '', 0)]);
  }

  // 사이트 닉네임 변경 (POST {nick}) → 계정에 저장 + 로그인 쿠키도 새 닉네임으로 다시 발급
  // 입력칸에 회색으로 보여 줄, 아무도 안 쓰는 랜덤 닉네임
  if (path === '/api/auth/nickname/suggest') {
    return json({ nick: await freeRandomNick() });
  }

  if (path === '/api/auth/nickname') {
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    const s = verify(cookies(req)[SESSION], secret);
    if (!s) return json({ error: '로그인이 필요해요.' }, 401);
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: '잘못된 요청이에요.' }, 400);
    }
    const c = cleanNick(body?.nick);
    if (c.error) return json({ error: c.error }, 400);
    const store = users();
    const rec = (await store.get(s.sub, { type: 'json' })) || { id: s.sub, nick: s.nick || '', joinedAt: new Date().toISOString(), loginCount: 1 };
    // 중복 금지: 다른 사람이 쓰는 닉네임이면 거절 (띄어쓰기·대소문자만 다른 것도 같은 이름으로 봄)
    if (!(await claimNick(s.sub, c.nick, rec.displayNick))) return json({ error: '이미 쓰고 있는 닉네임이에요. 다른 닉네임을 정해 주세요.' }, 409);
    rec.displayNick = c.nick;
    await store.setJSON(s.sub, rec);
    return json({ ok: true, nick: c.nick }, 200, [sessionCookie(s.sub, c.nick, s.keep !== false)]);
  }

  // 내 사주 정보(생년월일시·성별·태어난 곳)를 계정에 저장(POST {input}) / 삭제(DELETE) — 마이페이지
  if (path === '/api/auth/birth') {
    const s = verify(cookies(req)[SESSION], secret);
    if (!s) return json({ error: '로그인이 필요해요.' }, 401);
    const store = users();
    const rec = (await store.get(s.sub, { type: 'json' })) || { id: s.sub, nick: s.nick || '', joinedAt: new Date().toISOString(), loginCount: 1 };
    if (req.method === 'DELETE') {
      delete rec.birth;
      await store.setJSON(s.sub, rec);
      return json({ ok: true });
    }
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: '잘못된 요청이에요.' }, 400);
    }
    const i = body?.input || {};
    // 화면 입력값 그대로(문자열) 필요한 칸만 저장. 계산이 되는지로 검사
    const birth = {
      calendar: i.calendar === 'lunar' ? 'lunar' : 'solar',
      leap: i.leap === true,
      year: String(i.year ?? ''),
      month: String(i.month ?? ''),
      day: String(i.day ?? ''),
      timeKnown: i.timeKnown !== false,
      hour: i.timeKnown === false ? '' : String(i.hour ?? ''),
      minute: i.timeKnown === false ? '' : String(i.minute ?? '0'),
      gender: i.gender === 'female' ? 'female' : i.gender === 'male' ? 'male' : '',
      city: String(i.city || 'seoul').slice(0, 20),
    };
    try {
      computeSaju(birth);
    } catch (e) {
      return json({ error: e instanceof SajuInputError ? e.message : '입력값을 다시 확인해 주세요.' }, 400);
    }
    rec.birth = { ...birth, savedAt: new Date().toISOString() };
    await store.setJSON(s.sub, rec);
    return json({ ok: true, birth: rec.birth });
  }

  if (path === '/api/auth/delete') {
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    const s = verify(cookies(req)[SESSION], secret);
    if (!s) return json({ error: '로그인 정보가 없어요.' }, 401);
    try {
      // 탈퇴하면 쓰던 닉네임도 다른 사람이 쓸 수 있게 풀어 줌
      const rec = await users().get(s.sub, { type: 'json' });
      if (rec?.displayNick) {
        const owner = await nicknames().get(nickKey(rec.displayNick));
        if (owner === s.sub) await nicknames().delete(nickKey(rec.displayNick));
      }
      if (rec?.email) await emails().delete(emailKey(rec.email));
      // 이 회원이 남긴 문의도 지움
      const store = inquiries();
      const { blobs } = await store.list({ prefix: `${s.sub}/` });
      await Promise.all(blobs.map((b) => store.delete(b.key)));
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
    const list = (await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' }))))
      .filter(Boolean)
      .map(({ passHash, ...u }) => u); // 비밀번호 해시는 절대 내보내지 않음
    // 몇 번째 회원인지: 가입일 순 1, 2, 3… (탈퇴한 회원은 목록에 없어서 빠진 채로 다시 매김)
    list.sort((a, b) => String(a.joinedAt).localeCompare(String(b.joinedAt)));
    list.forEach((u, i) => (u.no = i + 1));
    list.sort((a, b) => String(b.lastLoginAt).localeCompare(String(a.lastLoginAt)));
    // 문의 목록도 함께 (관리자 화면의 '문의' 탭). key 로 답변을 저장함
    const inqs = (await listInquiries()).map((q) => ({ ...q, key: `${q.userId}/${q.id}` }));
    return json({ total: list.length, users: list, inquiries: inqs });
  }

  if (path === '/api/auth/kakao/login') {
    if (!enabled) return redirect('/?login=unavailable');
    const state = randomBytes(16).toString('hex');
    const next = safeNext(url.searchParams.get('next'));
    const keep = url.searchParams.get('keep') === '0' ? '0' : '1'; // 자동 로그인 체크 여부
    const auth = new URL('https://kauth.kakao.com/oauth/authorize');
    auth.searchParams.set('client_id', key);
    auth.searchParams.set('redirect_uri', redirectUri);
    auth.searchParams.set('response_type', 'code');
    auth.searchParams.set('state', state);
    return redirect(auth.toString(), [setCookie(STATE, `${state}|${keep}|${next}`, 600)]);
  }

  if (path === '/api/auth/kakao/callback') {
    const [savedState, keepFlag, ...rest] = (cookies(req)[STATE] || '').split('|');
    const next = rest.join('|') || '/';
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
      let showNick = nick.slice(0, 40);
      try {
        const r = await upsertUser(id, nick.slice(0, 40));
        isNew = r.isNew;
        showNick = r.displayNick || showNick;
      } catch (e) {
        console.error('user save failed:', e?.name); // 저장이 안 돼도 로그인은 진행
      }
      const dest = safeNext(next);
      // 화면에서 GA 이벤트(sign_up / login)를 보내도록 표시만 붙임 (개인 정보 없음)
      return redirect(`${dest}${dest.includes('?') ? '&' : '?'}login=${isNew ? 'new' : 'ok'}`, [clearState, sessionCookie(id, showNick, keepFlag !== '0')]);
    } catch (e) {
      return fail(e?.name || 'error');
    }
  }

  return json({ error: '없는 주소예요.' }, 404);
};

export const config = { path: ['/api/auth/kakao/login', '/api/auth/kakao/callback', '/api/auth/me', '/api/auth/logout', '/api/auth/delete', '/api/auth/birth', '/api/auth/nickname', '/api/auth/nickname/suggest', '/api/auth/email/signup', '/api/auth/email/verify', '/api/auth/email/login', '/api/auth/email/reset-request', '/api/auth/email/reset', '/api/auth/email/password', '/api/inquiry', '/api/admin/users', '/api/admin/inquiry'] };
