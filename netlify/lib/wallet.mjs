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
// 사용 (잔액이 모자라면 ok:false)
export const spend = (uid, amount, item, ref) => apply(uid, -Math.abs(amount), 'spend', item, ref);
// 사용 취소 (풀이를 못 만들었을 때 돌려줌)
export const refundSpend = (uid, amount, item, ref) => apply(uid, Math.abs(amount), 'return', item, ref);

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
// 신년운세 기록 id — 산 상품 키의 해시 부분을 그대로 씀 (같은 사람·같은 해면 같은 기록)
export const newyearRecordId = (pkey) => `ny-${pkey.split('/').pop()}`;
