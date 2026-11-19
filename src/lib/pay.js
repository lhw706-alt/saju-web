// 스마트로페이 결제창 (일반결제·대표인증, 2026-11-18 — 예전 토스페이먼츠에서 바꿈). 매뉴얼 https://manual.smartropay.co.kr/module.do
// 흐름: 서버에 주문 만들기(/api/pay/order → 결제창 값 + EncryptData) → 스마트로 결제창
//   PC: 결제창이 Callback 으로 Tid·TrAuthKey 를 줌 → approvalForm 을 ReturnUrl 로 제출
//   모바일: 결제창이 페이지를 이동하고, 끝나면 스마트로가 ReturnUrl 로 바로 POST
//   → 서버(/api/pay/smartro/return)가 승인·검증·적립 → /wallet?pay=success&c=금전 (중단하면 /wallet?pay=fail)
const DOMAINS = {
  STG: { pc: 'https://tpay.smartropay.co.kr', mobile: 'https://tmpay.smartropay.co.kr' },
  REAL: { pc: 'https://pay.smartropay.co.kr', mobile: 'https://mpay.smartropay.co.kr' },
};
const isMobile = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

let loaded = '';
function loadScript(src) {
  if (loaded === src && window.smartropay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => (window.smartropay ? ((loaded = src), resolve()) : reject(new Error('sdk')));
    s.onerror = () => reject(new Error('sdk'));
    document.head.appendChild(s);
  });
}

// 숨은 폼 만들기 (id·name 은 매뉴얼대로 고정)
function makeForm(id, action, fields) {
  document.getElementById(id)?.remove();
  const f = document.createElement('form');
  f.id = id;
  f.name = id;
  f.method = 'post';
  if (action) f.action = action;
  f.acceptCharset = 'UTF-8';
  f.style.display = 'none';
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement('input');
    i.type = 'hidden';
    i.name = k;
    i.value = v ?? '';
    f.appendChild(i);
  }
  document.body.appendChild(f);
  return f;
}

export async function startCharge(pkg, tel) {
  const r = await fetch('/api/pay/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pkg, tel }) });
  const o = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(o.error || '주문을 만들지 못했어요.');
  const mobile = isMobile();
  const domain = DOMAINS[o.mode === 'REAL' ? 'REAL' : 'STG'][mobile ? 'mobile' : 'pc'];
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  try {
    await loadScript(`${domain}/asset/js/SmartroPAY-1.0.min.js?version=${today}`);
  } catch {
    throw new Error('결제창을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  }
  makeForm('tranMgr', '', mobile ? { ...o.fields, ClientType: 'WEB' } : o.fields);
  window.smartropay.init({ mode: o.mode === 'REAL' ? 'REAL' : 'STG' });
  if (mobile) {
    window.smartropay.payment({ FormId: 'tranMgr' });
    return;
  }
  window.smartropay.payment({
    FormId: 'tranMgr',
    Callback: (res) => {
      const f = makeForm('approvalForm', o.fields.ReturnUrl, { Tid: res?.Tid || '', TrAuthKey: res?.TrAuthKey || '' });
      f.submit();
    },
  });
}
