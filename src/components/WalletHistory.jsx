// 마이페이지 '복채' 탭 (/my/wallet, 2026-11-15 사용자 지시) — 충전 화면이 아니라 내 보유 복채와 충전·사용 내역을 보여 줌.
// 충전은 '충전하기' → /wallet. 데이터는 /api/wallet (최근 50건).
import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Coins, announceBalance } from './BokchaLink.jsx';
import Select from './Select.jsx';
import PhoneVerifyModal from './PhoneVerifyModal.jsx';

const when = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const KIND = { charge: '충전', spend: '사용', return: '돌려받음', grant: '지급', refund: '환불', debit: '회수' };
const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'charge', label: '충전' },
  { id: 'spend', label: '사용' },
];

export default function WalletHistory() {
  const [w, setW] = useState(null);
  const [filter, setFilter] = useState('all');
  const [verifyOpen, setVerifyOpen] = useState(false);
  const { notify } = useOutletContext() || {};

  useEffect(() => {
    fetch('/api/wallet', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || '복채 정보를 불러오지 못했어요.');
        setW(d);
        announceBalance(d.balance);
      })
      .catch((e) => setW({ error: e.message || '복채 정보를 불러오지 못했어요.' }));
  }, []);

  const ledger = (w?.ledger || []).filter((e) => filter === 'all' || (filter === 'spend' ? ['spend', 'return', 'refund', 'debit'].includes(e.type) : e.type === 'charge' || e.type === 'grant'));

  return (
    <section className="mw" aria-labelledby="mw-title">
      <h2 id="mw-title" className="mw-title">내 복채</h2>
      <div className="mw-balance">
        {w && !w.error ? <Coins n={w.balance} size={34} className="mw-bal" /> : <b className="mw-bal-wait">{w?.error ? '-' : '…'}</b>}
        <Link to="/wallet" className="mw-charge">
          충전하기
        </Link>
      </div>
      {w?.error && <p className="rec-empty">{w.error}</p>}
      {w?.smsOn && (
        <p className="mw-phone">
          <span>결제 연락처</span>
          <b>{w.phone || '없음'}</b>
          <button type="button" className="mw-phone-btn" onClick={() => setVerifyOpen(true)}>
            {w.phone ? '번호 바꾸기' : '휴대폰 인증하기'}
          </button>
        </p>
      )}

      <div className="mw-head">
        <h3>충전·사용 내역</h3>
        <span className="sel-compact">
          <Select ariaLabel="내역 거르기" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f.id, label: f.label }))} />
        </span>
      </div>
      {w && !w.error && ledger.length === 0 && <p className="rec-empty">아직 내역이 없어요.</p>}
      {ledger.length > 0 && (
        <ul className="mw-list">
          {ledger.map((e, i) => (
            <li key={`${e.at}-${i}`}>
              <span className={`mw-kind is-${e.type}`}>{KIND[e.type] || e.type}</span>
              <span className="mw-what">
                {e.item}
                <small>{when(e.at)}</small>
              </span>
              <Coins n={e.amount} size={16} sign className={e.amount > 0 ? 'is-plus' : ''} />
            </li>
          ))}
        </ul>
      )}
      <PhoneVerifyModal
        open={verifyOpen}
        mode="manage"
        onClose={() => setVerifyOpen(false)}
        onDone={(phone) => {
          setW((old) => ({ ...old, phone }));
          setVerifyOpen(false);
          notify?.('결제 연락처를 저장했어요.');
        }}
      />
    </section>
  );
}
