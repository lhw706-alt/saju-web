// 복채 충전 (/wallet, 2026-11-14) — 잔액 · 충전 패키지 3가지 · 결제(스마트로 — 연동 전까지는 예전 토스 코드) · 충전·사용 내역 · 환불 안내.
// 결제창에서 돌아오면(?pay=success&paymentKey&orderId&amount) 서버 승인 후 잔액을 다시 불러옴. 주소의 결제 정보는 바로 지움.
import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { PACKAGES, fmtCredits } from '../lib/wallet.js';
import { startCharge, confirmCharge, payClientKey } from '../lib/pay.js';
import { trackEvent } from '../lib/analytics.js';
import { PouchIcon, Coins, announceBalance } from '../components/BokchaLink.jsx';

const when = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function Wallet() {
  const { auth, openLogin, notify } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [w, setW] = useState(null);
  const [pick, setPick] = useState('p8');
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false); // 결제 전 동의 (2026-11-17 사용자 지시 — 환불 정책은 이용약관 제7조의3에 포함)
  const [msg, setMsg] = useState(null); // { ok, text }
  const handled = useRef(false);

  const load = () =>
    fetch('/api/wallet', { cache: 'no-store' })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        setW(d);
        announceBalance(d?.balance);
      })
      .catch(() => setW({ error: true }));

  useEffect(() => {
    if (auth?.ready && auth.user) load();
  }, [auth?.ready, auth?.user]);

  // 결제창에서 돌아왔을 때
  useEffect(() => {
    if (handled.current || !auth?.ready) return;
    const pay = params.get('pay');
    if (!pay) return;
    handled.current = true;
    const data = { paymentKey: params.get('paymentKey'), orderId: params.get('orderId'), amount: params.get('amount') };
    const failMsg = params.get('message');
    setParams({}, { replace: true });
    if (pay === 'fail') {
      setMsg({ ok: false, text: failMsg || '결제를 마치지 못했어요. 결제된 금액은 없어요.' });
      return;
    }
    if (!auth.user) return;
    setBusy(true);
    confirmCharge(data)
      .then((d) => {
        trackEvent('charge_done', { credits: d.credits });
        setMsg({ ok: true, text: `${fmtCredits(d.credits)}이 충전됐어요.` });
        load();
      })
      .catch((e) => setMsg({ ok: false, text: e.message }))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.ready, auth?.user]);

  // 비회원도 충전 금액·환불 정책을 볼 수 있게 (2026-11-16 토스페이먼츠 심사 대비) — 결제 버튼만 로그인으로
  const guest = auth?.ready && !auth.user;

  const charge = async () => {
    setBusy(true);
    setMsg(null);
    trackEvent('charge_start', { pkg: pick });
    try {
      await startCharge(pick); // 결제창으로 이동 (돌아오면 위에서 처리)
    } catch (e) {
      if (!/취소|cancel/i.test(e?.message || '')) notify(e?.message || '결제창을 열지 못했어요.', 'negative');
    }
    setBusy(false);
  };
  const ready = Boolean(payClientKey) && w?.enabled !== false;

  return (
    <section className="wallet">
      <span className="wallet-pouch"><PouchIcon size={88} /></span>
      <h1 className="start-title">복채 충전</h1>
      <p className="start-lead">{guest ? '복채(금전)로 평생 사주·신년운세·타로 같은 유료 풀이를 볼 수 있어요. 충전은 로그인한 회원만 할 수 있어요.' : "복채로 타로와 신년운세를 볼 수 있어요. 본 풀이는 마이페이지 '풀이 기록'에 남아요."}</p>

      {!guest && (
      <div className="wallet-balance">
        <span>내 복채</span>
        {w && !w.error ? <Coins n={w.balance} size={30} className="wallet-bal" /> : <b>…</b>}
      </div>
      )}

      {msg && (
        <p className={`wallet-msg${msg.ok ? ' is-ok' : ''}`} role="status">
          {msg.text}
        </p>
      )}

      <h2 className="wallet-h2">충전할 금액</h2>
      <ul className="wallet-pkgs" role="radiogroup" aria-label="충전 금액">
        {PACKAGES.map((p) => (
          <li key={p.id}>
            <button type="button" role="radio" aria-checked={pick === p.id} className={pick === p.id ? 'on' : ''} onClick={() => setPick(p.id)}>
              <span className="wallet-radio" aria-hidden="true" />
              <span className="wallet-pkg-main">
                <span className="wallet-pkg-amt">
                  <Coins n={p.base} size={26} className="wallet-pkg-coins" />
                  {p.extra > 0 && <em className="wallet-pkg-extra">+{p.extra} 더</em>}
                </span>
                {p.can && <small className="wallet-pkg-can">{p.can}</small>}
              </span>
              <span className="wallet-pkg-price">
                <b>{p.label}</b>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {guest ? (
        <button type="button" className="btn-primary wallet-pay" onClick={() => openLogin('복채를 충전하려면 로그인해 주세요.')}>
          로그인하고 충전하기
        </button>
      ) : (
        <>
        <label className="login-keep wallet-agree">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span className="login-keep-box" aria-hidden="true" />
          <span>
            (필수) 위 주문 내용을 확인했고, <Link to="/terms#refund" target="_blank" rel="noopener">이용약관(환불 정책 포함)</Link>과{' '}
            <Link to="/privacy" target="_blank" rel="noopener">개인정보 처리방침</Link>에 동의해요.
          </span>
        </label>
        <button type="button" className="btn-primary wallet-pay" onClick={charge} disabled={busy || !ready || !agree}>
          {busy ? '처리 중…' : ready ? `${PACKAGES.find((p) => p.id === pick).label} 결제하기` : '결제 준비중이에요'}
        </button>
        </>
      )}


      {w?.ledger?.length > 0 && (
        <>
          <h2 className="wallet-h2">충전·사용 내역</h2>
          <ul className="wallet-ledger">
            {w.ledger.map((e, i) => (
              <li key={`${e.at}-${i}`}>
                <span className="wallet-ledger-what">
                  {e.item}
                  <small>{when(e.at)}</small>
                </span>
                <Coins n={e.amount} size={16} sign className={e.amount > 0 ? 'is-plus' : ''} />
              </li>
            ))}
          </ul>
        </>
      )}

    </section>
  );
}
