// 사람마다 한 번 사는 유료 상품(평생 사주 등)의 결제 확인 + 결제 카드 (2026-11-15).
// /api/wallet/owned 로 산 적 있는지 보고, 없으면 결제 카드. 사면(/api/wallet/buy) children 을 보여 줌.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRICES, fmtCredits } from '../lib/wallet.js';
import { PriceTag, announceBalance } from './BokchaLink.jsx';
import { trackEvent } from '../lib/analytics.js';
import { askConfirm, showAlert } from './ConfirmHost.jsx';

const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }));

export default function PaidGate({ item, input, member, openLogin, title, desc, points = [], onBought, children }) {
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
      if (await askConfirm({ title: '복채가 조금 모자라요', message: `${title}에는 ${fmtCredits(price)}이 필요해요. 지금 ${fmtCredits(state.balance)} 있어요.`, ok: '충전하러 가기', cancel: '다음에' })) navigate('/wallet');
      return;
    }
    if (!(await askConfirm({ title: `${title}를 열까요?`, message: `${fmtCredits(price)}을 쓰면 바로 풀이가 시작돼요. 지금 ${fmtCredits(state.balance)} 있어요.`, note: `같은 사람의 ${title}는 다시 볼 때 금전이 들지 않아요.`, ok: `${fmtCredits(price)}으로 열기`, cancel: '취소' }))) return;
    setBusy(true);
    const r = await post('/api/wallet/buy', { item, input });
    setBusy(false);
    if (!r.ok) return showAlert(r.data.error || '열지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    trackEvent('paid_buy', { item });
    announceBalance(r.data.balance);
    onBought?.();
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
      <button type="button" className="pay-cta" onClick={buy} disabled={busy || state.owned === null}>
        <span>{state.owned === null ? '확인 중…' : `${title} 열어 보기`}</span>
        <span className="pay-cta-price">
          <PriceTag n={price} size={18} />
        </span>
      </button>
      <p className="paygate-note">한 번 열면 같은 사람의 {title}는 다시 볼 때 금전이 들지 않고, 마이페이지 ‘풀이 기록’에 남아요.</p>
    </section>
  );
}
