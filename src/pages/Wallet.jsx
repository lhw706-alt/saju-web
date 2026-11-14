// 복채 충전 (/wallet, 2026-11-14) — 잔액 · 충전 패키지 3가지 · 결제(토스페이먼츠) · 충전·사용 내역 · 환불 안내.
// 결제창에서 돌아오면(?pay=success&paymentKey&orderId&amount) 서버 승인 후 잔액을 다시 불러옴. 주소의 결제 정보는 바로 지움.
import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { PACKAGES, PRICES, fmtCredits } from '../lib/wallet.js';
import { startCharge, confirmCharge, payClientKey } from '../lib/pay.js';
import { trackEvent } from '../lib/analytics.js';

const when = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function Wallet() {
  const { auth, openLogin, notify } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [w, setW] = useState(null);
  const [pick, setPick] = useState('p10');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const handled = useRef(false);

  const load = () =>
    fetch('/api/wallet', { cache: 'no-store' })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => setW(d))
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
        setMsg({ ok: true, text: `복채 ${fmtCredits(d.credits)}이 충전됐어요.` });
        load();
      })
      .catch((e) => setMsg({ ok: false, text: e.message }))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.ready, auth?.user]);

  if (auth?.ready && !auth.user) {
    return (
      <section className="wallet">
        <h1 className="start-title">복채 충전</h1>
        <p className="start-lead">복채는 로그인한 회원만 충전하고 쓸 수 있어요.</p>
        <button type="button" className="btn-primary wallet-login" onClick={() => openLogin('복채를 충전하려면 로그인해 주세요.')}>
          로그인
        </button>
      </section>
    );
  }

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
      <h1 className="start-title">복채 충전</h1>
      <p className="start-lead">복채로 타로 세 장 펼침, 신년운세 월별 상세 리포트 같은 깊은 풀이를 볼 수 있어요.</p>

      <div className="wallet-balance">
        <span>내 복채</span>
        <b>{w && !w.error ? fmtCredits(w.balance) : '…'}</b>
      </div>

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
              <b>{fmtCredits(p.credits)}</b>
              <span>{p.label}</span>
              {p.bonus && <em>{p.bonus}</em>}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn-primary wallet-pay" onClick={charge} disabled={busy || !ready}>
        {busy ? '처리 중…' : ready ? `${PACKAGES.find((p) => p.id === pick).label} 결제하기` : '결제 준비중이에요'}
      </button>

      <h2 className="wallet-h2">복채 쓰는 곳</h2>
      <ul className="wallet-prices">
        {Object.values(PRICES).map((p) => (
          <li key={p.label}>
            <span>{p.label}</span>
            <b>{fmtCredits(p.credits)}</b>
          </li>
        ))}
      </ul>

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
                <b className={e.amount > 0 ? 'is-plus' : ''}>
                  {e.amount > 0 ? '+' : ''}
                  {fmtCredits(e.amount)}
                </b>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="wallet-notice">
        <p>1천은 100원이에요. 충전한 복채는 사주천문에서만 쓸 수 있고, 유효기간은 충전일로부터 5년이에요.</p>
        <p>
          충전 후 7일 안에 쓰지 않은 복채는 전액 환불받을 수 있고, 일부를 쓴 뒤에도 남은 복채는 환불을 요청할 수 있어요. 환불은{' '}
          <Link to="/my/support">고객센터</Link>로 요청해 주세요. 자세한 내용은 <Link to="/terms">이용약관</Link>을 확인해 주세요.
        </p>
        <p>풀이를 만들지 못하면 쓴 복채는 자동으로 돌려드려요. 회원 탈퇴하면 남은 복채가 사라지니, 탈퇴 전에 환불을 먼저 요청해 주세요.</p>
      </div>
    </section>
  );
}
