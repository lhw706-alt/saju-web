// 스마트로 결제창이 돌려보내는 주소 (2026-11-18)
//  POST /api/pay/smartro/return  ← Tid·TrAuthKey (form). 승인 API → SignValue·주문번호·금액 확인 → 금전 적립 → /wallet?pay=success
//  POST /api/pay/smartro/stop    ← 결제 중단(모바일 StopUrl) → /wallet?pay=fail
// 스마트로 쪽에서 오는 요청이라 로그인 쿠키가 안 붙을 수 있음 → 회원은 주문 기록(orders)의 uid 로 찾음. 출처 검사도 하지 않음.
import { getStore } from '@netlify/blobs';
import { credit } from '../lib/wallet.mjs';
import { smartroEnv, approve, signOk, PAID_CODES } from '../lib/smartro.mjs';

const ORDER_RE = /^SC[a-z0-9]{6,12}[0-9a-f]{12}$/;
const go = (path) => new Response(null, { status: 303, headers: { location: path, 'cache-control': 'no-store' } });
const fail = (msg) => go(`/wallet?pay=fail&message=${encodeURIComponent(msg)}`);

async function formOf(req) {
  const text = await req.text().catch(() => '');
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(text));
}

export default async (req) => {
  const path = new URL(req.url).pathname;
  if (req.method !== 'POST') return go('/wallet');
  const f = await formOf(req);

  if (path === '/api/pay/smartro/stop') {
    return fail(f.ResultMsg ? `결제를 마치지 못했어요. (${String(f.ResultMsg).slice(0, 60)})` : '결제를 취소했어요. 결제된 금액은 없어요.');
  }

  const env = smartroEnv();
  if (!env.ready) return fail('결제가 아직 준비되지 않았어요.');
  const Tid = String(f.Tid || '');
  const TrAuthKey = String(f.TrAuthKey || '');
  if (!Tid || !TrAuthKey || Tid.length > 60 || TrAuthKey.length > 400) return fail('결제 인증 정보가 없어요. 결제된 금액은 없어요.');

  const res = await approve(env.mode, Tid, TrAuthKey);
  if (!res) {
    console.error('smartro approve: no response');
    return fail('결제 승인 응답을 받지 못했어요. 결제가 됐다면 확인 뒤 금전을 넣어 드릴게요. 고객센터로 문의해 주세요.');
  }
  const orders = getStore({ name: 'orders', consistency: 'strong' });
  const orderId = String(res.Moid || '');
  const o = ORDER_RE.test(orderId) ? await orders.get(orderId, { type: 'json' }).catch(() => null) : null;
  const code = String(res.ResultCode || '');
  const amt = Number(String(res.Amt || '').replace(/[^0-9]/g, ''));

  if (!signOk(res, env.key)) {
    console.error('smartro approve: bad sign', code);
    if (o) await orders.setJSON(orderId, { ...o, status: 'failed', failCode: `sign:${code}`, tid: res.Tid || Tid, failedAt: new Date().toISOString() });
    return fail('결제 결과를 확인하지 못했어요. 결제가 됐다면 고객센터로 문의해 주세요.');
  }
  if (!o) {
    console.error('smartro approve: order not found', orderId, code);
    return fail('주문을 찾지 못했어요. 결제가 됐다면 고객센터로 문의해 주세요.');
  }
  if (o.status === 'done') return go(`/wallet?pay=success&c=${o.credits}`);
  if (!PAID_CODES.has(code)) {
    await orders.setJSON(orderId, { ...o, status: 'failed', failCode: code, failMsg: String(res.ResultMsg || '').slice(0, 100), tid: res.Tid || Tid, failedAt: new Date().toISOString() });
    return fail(`결제를 마치지 못했어요. ${String(res.ResultMsg || '').slice(0, 60)}`.trim());
  }
  if (amt !== o.won || String(res.Mid || env.mid) !== env.mid) {
    // 금액이 다르면 적립하지 않음 — 운영자가 스마트로 관리자에서 취소
    await orders.setJSON(orderId, { ...o, status: 'mismatch', tid: res.Tid || Tid, paidAmt: amt, failedAt: new Date().toISOString() });
    console.error('smartro approve: amount mismatch', orderId, amt, o.won);
    return fail('결제 금액이 주문과 달라요. 고객센터로 문의해 주시면 결제를 취소해 드릴게요.');
  }
  await orders.setJSON(orderId, {
    ...o,
    status: 'done',
    pg: 'smartro',
    tid: res.Tid || Tid,
    method: res.PayMethod || null,
    authCode: res.AuthCode || null,
    approvedAt: new Date().toISOString(),
  });
  await credit(o.uid, o.credits, `충전 ${o.won.toLocaleString('ko-KR')}원`, orderId);
  return go(`/wallet?pay=success&c=${o.credits}`);
};

export const config = { path: ['/api/pay/smartro/return', '/api/pay/smartro/stop'] };
