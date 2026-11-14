// 토스페이먼츠 결제창 (SDK v2, 2026-11-14). 클라이언트 키는 Netlify 환경 변수 VITE_TOSS_CLIENT_KEY(공개 키, test_ck_… / live_ck_…).
// 흐름: 서버에 주문 만들기(/api/pay/order) → 결제창 → 성공하면 /wallet?pay=success&paymentKey&orderId&amount 로 돌아옴 → 서버 승인(/api/pay/confirm)
const SDK = 'https://js.tosspayments.com/v2/standard';
export const payClientKey = import.meta.env.VITE_TOSS_CLIENT_KEY || '';

function loadSdk() {
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SDK;
    s.onload = () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error('sdk')));
    s.onerror = () => reject(new Error('sdk'));
    document.head.appendChild(s);
  });
}

export async function startCharge(pkg) {
  if (!payClientKey) throw new Error('결제가 아직 준비되지 않았어요.');
  const r = await fetch('/api/pay/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pkg }) });
  const o = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(o.error || '주문을 만들지 못했어요.');
  const TossPayments = await loadSdk();
  const payment = TossPayments(payClientKey).payment({ customerKey: o.customerKey });
  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: o.amount },
    orderId: o.orderId,
    orderName: o.orderName,
    successUrl: `${window.location.origin}/wallet?pay=success`,
    failUrl: `${window.location.origin}/wallet?pay=fail`,
  });
}

export async function confirmCharge({ paymentKey, orderId, amount }) {
  const r = await fetch('/api/pay/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || '결제를 승인하지 못했어요.');
  return d;
}
