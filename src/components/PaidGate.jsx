// 사람마다 한 번 사는 유료 상품(평생 사주 등)의 결제 확인 + 결제 카드 (2026-11-15).
// /api/wallet/owned 로 산 적 있는지 보고, 없으면 결제 카드. 사면(/api/wallet/buy) children 을 보여 줌.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRICES, fmtCredits } from '../lib/wallet.js';
import { PriceTag, announceBalance } from './BokchaLink.jsx';
import { trackEvent } from '../lib/analytics.js';

const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }));

export default function PaidGate({ item, input, member, openLogin, title, desc, points = [], children }) {
  const navigate = useNavigate();
  const price = PRICES[item].credits;
  const [state, setState] = useState({ owned: member ? null : false, balance: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!member) return setState({ owned: false, balance: 0 });
    post('/api/wallet/owned', { item, input }).then((r) => setState(r.ok ? { owned: !!r.data.owned, balance: r.data.balance || 0 } : { owned: false, balance: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member, item]);

  if (state.owned) return children;

  const buy = async () => {
    if (!member) return openLogin?.(`${title}는 복채로 볼 수 있어요. 로그인해 주세요.`);
    if (state.balance < price) {
      trackEvent('paid_need_credit', { item });
      if (window.confirm(`복채가 ${fmtCredits(price - state.balance)} 모자라요. 충전하러 갈까요? (지금 ${fmtCredits(state.balance)})`)) navigate('/wallet');
      return;
    }
    if (!window.confirm(`${title}에 ${fmtCredits(price)}을 쓸까요? (지금 ${fmtCredits(state.balance)})\n같은 사람의 ${title}는 다시 볼 때 금전이 들지 않아요.`)) return;
    setBusy(true);
    const r = await post('/api/wallet/buy', { item, input });
    setBusy(false);
    if (!r.ok) return window.alert(r.data.error || '열지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    trackEvent('paid_buy', { item });
    announceBalance(r.data.balance);
    setState({ owned: true, balance: r.data.balance });
  };

  return (
    <section className="paygate card" aria-labelledby="paygate-title">
      <PriceTag n={price} size={22} className="paygate-price" />
      <h2 id="paygate-title" className="paygate-title">{title}</h2>
      {desc && <p className="paygate-desc">{desc}</p>}
      {points.length > 0 && (
        <ul className="paygate-points">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <button type="button" className="btn-primary paygate-btn" onClick={buy} disabled={busy || state.owned === null}>
        {state.owned === null ? '확인 중…' : `${fmtCredits(price)}으로 보기`}
      </button>
      <p className="paygate-note">한 번 열면 같은 사람의 {title}는 다시 볼 때 금전이 들지 않고, 마이페이지 ‘풀이 기록’에 남아요.</p>
    </section>
  );
}
