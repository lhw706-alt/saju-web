// 복채 지갑 (2026-11-14) — Netlify Blobs 'wallet', 키 = 회원번호, 값 = { balance, ledger: [{ at, type, amount, item, ref, balance }] (최근 200건) }.
// 충전(결제 승인)·사용 모두 여기로. 결제 기록 원본은 Blobs 'orders'(전자상거래법상 5년 보관 — 탈퇴해도 지우지 않음).
import { getStore } from '@netlify/blobs';

const store = () => getStore({ name: 'wallet', consistency: 'strong' });
const empty = () => ({ balance: 0, ledger: [] });

export async function walletOf(uid) {
  return (await store().get(uid, { type: 'json' }).catch(() => null)) || empty();
}

async function apply(uid, delta, type, item, ref) {
  const w = await walletOf(uid);
  const balance = (w.balance || 0) + delta;
  if (balance < 0) return { ok: false, balance: w.balance || 0 };
  const entry = { at: new Date().toISOString(), type, amount: delta, item, ref: ref || null, balance };
  await store().setJSON(uid, { balance, ledger: [entry, ...(w.ledger || [])].slice(0, 200) });
  return { ok: true, balance };
}

// 충전 (같은 ref = 주문번호로 두 번 적립되지 않게)
export async function credit(uid, amount, item, ref) {
  const w = await walletOf(uid);
  if (ref && (w.ledger || []).some((e) => e.type === 'charge' && e.ref === ref)) return { ok: true, balance: w.balance, dup: true };
  return apply(uid, amount, 'charge', item, ref);
}
// 운영자 지급 (관리자 화면, 2026-11-15) — 결제가 아니라 환불 대상이 아님
export const grant = (uid, amount, item) => apply(uid, Math.abs(amount), 'grant', item, `grant-${Date.now().toString(36)}`);
// 사용 (잔액이 모자라면 ok:false)
export const spend = (uid, amount, item, ref) => apply(uid, -Math.abs(amount), 'spend', item, ref);
// 사용 취소 (풀이를 못 만들었을 때 돌려줌)
export const refundSpend = (uid, amount, item, ref) => apply(uid, Math.abs(amount), 'return', item, ref);
// 운영자가 빼기 (2026-11-17 — 환불 처리·도용 회수 등). 잔액보다 많으면 잔액만큼만. type: 'refund' | 'debit'
export async function deduct(uid, amount, type, item, ref) {
  const w = await walletOf(uid);
  const n = Math.min(Math.abs(amount), w.balance || 0);
  if (n <= 0) return { ok: true, balance: w.balance || 0, taken: 0 };
  const r = await apply(uid, -n, type, item, ref);
  return { ...r, taken: n };
}

// ── 환불 계산 (2026-11-17 사용자 결정, 이용약관 제7조의3) ──
// 환불 금액 = 그 충전에 낸 금액 − 그 충전에서 쓴 금전 × 100원(정가). 7일 안은 그대로, 7일이 지나면 10% 공제(1원 미만 버림).
// 무상 금전(운영자 지급)을 먼저 쓴 것으로 보고, 유상 금전은 먼저 충전한 것부터 쓴 것으로 봄. 더 드린 금전(+N)도 그 충전의 금전.
// 이미 환불한 충전은 orders 기록의 refundUsed(환불 때 그 충전에서 쓴 금전)만큼만 쓴 것으로 고정.
export const WON_PER = 100;
export const DAY7 = 7 * 24 * 3600e3;
export function refundPlan(w, orderOf = {}, now = Date.now()) {
  const ledger = [...(w.ledger || [])].reverse(); // 오래된 것부터
  const used = Math.max(0, ledger.reduce((t, e) => t + (e.type === 'spend' ? -e.amount : e.type === 'return' ? -e.amount : 0), 0));
  const free = ledger.reduce((t, e) => t + (e.type === 'grant' ? e.amount : 0), 0);
  let paidUsed = Math.max(0, used - free);
  const charges = ledger.filter((e) => e.type === 'charge').map((e) => {
    const o = orderOf[e.ref] || {};
    const won = Number(o.won) || Number(String(e.item || '').replace(/[^0-9]/g, '')) || e.amount * WON_PER;
    return { orderId: e.ref, at: e.at, won, credits: e.amount, method: o.method || null, refunded: Boolean(o.refundedAt), refundedAt: o.refundedAt || null, refundWon: o.refundWon ?? null, refundUsed: o.refundUsed ?? null };
  });
  for (const c of charges) {
    const cap = c.refunded ? Math.min(c.credits, c.refundUsed ?? c.credits) : c.credits;
    c.used = Math.min(cap, paidUsed);
    paidUsed -= c.used;
    c.left = c.refunded ? 0 : c.credits - c.used;
    c.within7 = now - Date.parse(c.at) <= DAY7;
    const base = Math.max(0, c.won - c.used * WON_PER);
    c.refundable = c.refunded ? 0 : c.within7 ? base : Math.floor(base * 0.9);
  }
  return { balance: w.balance || 0, used, free, charges };
}

// 산 상품 기록 (2026-11-14): Blobs 'purchases', 키 = u/회원번호/상품/사람·연도 해시 → 같은 사람·같은 해 상품은 한 번만 결제
import { createHash } from 'node:crypto';
import { normalizeInput } from '../../src/lib/saju.js';
const purchases = () => getStore({ name: 'purchases', consistency: 'strong' });
export function purchaseKey(uid, item, input, extra = '') {
  const n = normalizeInput(input);
  const who = [n.calendar, n.leap ? 1 : 0, n.year, n.month, n.day, n.timeKnown ? `${n.hour}:${n.minute}` : '-', n.gender, n.city].join('|');
  return `u/${uid}/${item}/${createHash('sha256').update(`${who}#${extra}`).digest('base64url').slice(0, 32)}`;
}
export const owned = async (key) => Boolean(await purchases().get(key).catch(() => null));
export const markOwned = (key, info) => purchases().setJSON(key, { ...info, at: new Date().toISOString() });

// 유료 풀이 기록 (2026-11-15 사용자 지시 — 마이페이지 '풀이 기록'). Blobs 'records', 키 = u/회원번호/기록id.
// 타로는 볼 때마다 한 건(id = 시간 역순), 신년운세는 산 상품 한 건(id = ny-사람·해 해시)에 한 해 흐름·월별 글을 모음. 회원 탈퇴하면 지움.
const records = () => getStore({ name: 'records', consistency: 'strong' });
export const recordId = () => `${(9e15 - Date.now()).toString(36)}-${Math.random().toString(36).slice(2, 6)}`; // 최신이 먼저 나열되게
export const putRecord = (uid, id, rec) => records().setJSON(`u/${uid}/${id}`, rec);
export const getRecord = (uid, id) => records().get(`u/${uid}/${id}`, { type: 'json' }).catch(() => null);
export async function listRecords(uid, limit = 50) {
  const { blobs } = await records().list({ prefix: `u/${uid}/` });
  const out = await Promise.all(blobs.map(async (b) => ({ id: b.key.split('/').pop(), ...((await records().get(b.key, { type: 'json' }).catch(() => null)) || {}) })));
  return out.filter((r) => r.kind).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, limit);
}
export const deleteRecord = (uid, id) => records().delete(`u/${uid}/${id}`);
export async function deleteAllRecords(uid) {
  const { blobs } = await records().list({ prefix: `u/${uid}/` });
  await Promise.all(blobs.map((b) => records().delete(b.key)));
}
// 사람마다 사는 상품(신년운세·평생 사주)의 키 — 신년운세는 내년 연도까지 붙임
import { PAID_ITEMS } from '../../src/lib/wallet.js';
// 궁합(pair)은 두 사람 조합마다 — input.partner 의 해시를 extra 로
export const itemKey = (uid, item, input) => PAID_ITEMS[item]?.pair
  ? purchaseKey(uid, item, input, purchaseKey(uid, item, input?.partner).split('/').pop())
  : purchaseKey(uid, item, input, PAID_ITEMS[item]?.perYear ? String(new Date().getFullYear() + 1) : '');
// 상품 기록 id — 산 상품 키의 해시 부분을 그대로 씀 (같은 사람(·같은 해)이면 같은 기록)
export const itemRecordId = (item, pkey) => `${PAID_ITEMS[item]?.prefix || 'x'}-${pkey.split('/').pop()}`;
