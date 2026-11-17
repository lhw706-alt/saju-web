// 관리자 디자인 시스템 문서 (/api/admin/ds, 2026-11-17 사용자 지시 — /admin 에서 이동)
// 관리자 비밀번호(Authorization: Bearer ADMIN_PASSWORD)를 확인한 뒤에만 HTML 을 돌려줌. 화면은 받은 HTML 을 새 탭(blob 주소)으로 엶.
// HTML 은 portfolio/tools/ds-build.mjs 가 만든 netlify/lib/designSystemHtml.mjs (직접 고치지 말 것). 그림은 public/ds/.
import { timingSafeEqual } from 'node:crypto';
import html from '../lib/designSystemHtml.mjs';

const fails = new Map(); // 틀린 비밀번호만 셈: 같은 IP 10분 5번이면 막음
const same = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
};
const err = (error, status) => new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default async (req, context) => {
  if (req.method !== 'POST') return err('잘못된 요청이에요.', 405);
  const admin = process.env.ADMIN_PASSWORD;
  if (!admin) return err('관리자 비밀번호가 설정되지 않았어요.', 503);
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  const now = Date.now();
  const list = (fails.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  if (list.length >= 5) return err('시도가 너무 많아요. 10분 뒤 다시 해 주세요.', 429);
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!same(given, admin)) {
    fails.set(ip, [...list, now]);
    if (fails.size > 5000) fails.clear();
    return err('비밀번호가 맞지 않아요.', 401);
  }
  const origin = new URL(req.url).origin;
  return new Response(html.split('__ORIGIN__').join(origin), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' },
  });
};

export const config = { path: '/api/admin/ds' };
