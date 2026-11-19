// 복채 충전 (/wallet, 2026-11-14) — 잔액 · 충전 패키지 3가지 · 결제(스마트로) · 충전·사용 내역 · 환불 안내.
// 스마트로 결제창 → 서버가 승인·적립 후 /wallet?pay=success&c=금전 로 보냄. 처음 결제면 결제하기를 누를 때 휴대폰 인증 창(PhoneVerifyModal)부터.
import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { PACKAGES, fmtCredits } from '../lib/wallet.js';
import { startCharge } from '../lib/pay.js';
import { trackEvent } from '../lib/analytics.js';
import { PouchIcon, Coins, announceBalance } from '../components/BokchaLink.jsx';
import PhoneVerifyModal from '../components/PhoneVerifyModal.jsx';

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
  const [agree, setAgree] = useState(false);
  // 결제용 휴대폰 번호 (스마트로 필수, 2026-11-19) — 서버에 저장하지 않고 이 브라우저에만 기억
  const [tel, setTel] = useState(() => {
    try {
      return localStorage.getItem('saju:buyer-tel') || '';
    } catch {
      return '';
    }
  });
  const telOk = /^01[016789][0-9]{7,8}$/.test(tel);
  // 첫 결제 휴대폰 인증 (2026-11-19 사용자 지시: 결제하기를 누르면 처음 한 번 모달로) — 문자 인증이 켜져 있을 때만
  const [verifyOpen, setVerifyOpen] = useState(false);
  const phoneReady = w?.smsOn ? true : telOk;
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

  // 결제창에서 돌아왔을 때 (스마트로 → 서버가 승인·적립까지 마치고 /wallet?pay=success&c=금전 또는 ?pay=fail&message= 로 보냄)
  useEffect(() => {
    if (handled.current || !auth?.ready) return;
    const pay = params.get('pay');
    if (!pay) return;
    handled.current = true;
    const credits = Number(params.get('c')) || 0;
    const failMsg = params.get('message');
    setParams({}, { replace: true });
    if (pay === 'fail') {
      notify(failMsg || '결제를 마치지 못했어요. 결제된 금액은 없어요.', 'negative'); // 2026-11-19 사용자 지시: 아래쪽 토스트로
      return;
    }
    trackEvent('charge_done', { credits });
    notify(credits ? `${fmtCredits(credits)}이 충전됐어요.` : '충전됐어요.');
    if (auth.user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.ready, auth?.user]);

  // 비회원도 충전 금액·환불 정책을 볼 수 있게 (2026-11-16 토스페이먼츠 심사 대비) — 결제 버튼만 로그인으로
  const guest = auth?.ready && !auth.user;

  const charge = async () => {
    if (w?.smsOn && !w?.phone) return setVerifyOpen(true); // 처음 결제 → 인증 창부터
    setBusy(true);
    trackEvent('charge_start', { pkg: pick });
    try {
      try {
        localStorage.setItem('saju:buyer-tel', tel);
      } catch {}
      await startCharge(pick, w?.smsOn ? '' : tel); // 결제창으로 이동 (돌아오면 위에서 처리). 인증한 번호는 서버가 계정에서 씀
    } catch (e) {
      if (!/취소|cancel/i.test(e?.message || '')) notify(e?.message || '결제창을 열지 못했어요.', 'negative');
    }
    setBusy(false);
  };
  const ready = w?.enabled === true;

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
        {/* 결제 연락처는 마이페이지 '복채' 탭에서 관리 (2026-11-19). 서버 응답 전에는 아무것도 안 그림 — 새로고침 때 예전 입력칸이 잠깐 보이던 문제 */}
        {w && !w.error && w.enabled && !w.smsOn && (
          <>
            <label className="contact-label wallet-tel-label" htmlFor="wallet-tel">휴대폰 번호</label>
            <div className="wallet-tel-row">
              <input id="wallet-tel" className="contact-input wallet-tel" type="tel" inputMode="numeric" autoComplete="tel" placeholder="01012345678" value={tel} onChange={(e) => setTel(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))} />
            </div>
            <p className="wallet-tel-note">결제대행사(스마트로) 결제 확인에만 쓰이고, 사주천문에는 저장하지 않아요.</p>
          </>
        )}
        <label className="login-keep wallet-agree">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span className="login-keep-box" aria-hidden="true" />
          <span>
            (필수) 위 주문 내용을 확인했고, <Link to="/terms">이용약관</Link>과 <Link to="/privacy">개인정보 처리방침</Link>에 동의해요.
          </span>
        </label>
        <button type="button" className="btn-primary wallet-pay" onClick={charge} disabled={busy || !ready || !agree || !phoneReady}>
          {busy ? '처리 중…' : ready || !w ? `${PACKAGES.find((p) => p.id === pick).label} 결제하기` : '결제 준비중이에요'}
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

      <PhoneVerifyModal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onDone={(phone) => {
          setW((old) => ({ ...old, phone }));
          setVerifyOpen(false);
          setBusy(true);
          startCharge(pick, '')
            .catch((e) => notify(e?.message || '결제창을 열지 못했어요.', 'negative'))
            .finally(() => setBusy(false));
        }}
      />
    </section>
  );
}
