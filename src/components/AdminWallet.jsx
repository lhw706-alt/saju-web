// 관리자 '금전' 탭의 회원별 복채 내역·환불 계산·환불 처리·금전 빼기 (2026-11-17 사용자 지시)
// 계산은 서버(netlify/lib/wallet.mjs refundPlan)가 함 — 이용약관 제7조의3: 낸 금액 − 쓴 금전 × 100원, 7일이 지나면 10% 공제.
// 결제 취소는 스마트로 가맹점 관리자에서 따로 (취소 API 연동 전).
import { useEffect, useState } from 'react';
import { askConfirm } from './ConfirmHost.jsx';

const won = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`;
const day = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const KIND = { charge: '충전', spend: '사용', return: '돌려받음', grant: '지급', refund: '환불', debit: '회수' };

export default function AdminWallet({ userId, name, pw, onBalance }) {
  const [plan, setPlan] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [debit, setDebit] = useState({ amount: '', memo: '' });

  const call = async (path, body) => {
    const r = await fetch(path, { method: 'POST', headers: { authorization: `Bearer ${pw}`, 'content-type': 'application/json' }, body: JSON.stringify({ userId, ...body }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) throw new Error(d?.error || '처리하지 못했어요.');
    setPlan(d);
    onBalance?.(d.balance);
    return d;
  };
  useEffect(() => {
    call('/api/admin/wallet').catch((e) => setMsg(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const refund = async (c) => {
    const ok = await askConfirm({
      title: `${won(c.refundable)} 환불 처리할까요?`,
      message: `${day(c.at)} ${won(c.won)} 충전(${c.credits}금전)에서 ${c.used}금전을 썼어요. 남은 ${c.left}금전을 회원 복채에서 빼고, 이 충전을 환불 완료로 표시해요.`,
      note: '결제 취소(돈 돌려주기)는 스마트로 가맹점 관리자에서 직접 해 주세요. 카드·간편결제는 이 금액만큼 부분 취소, 가상계좌는 회원 본인 계좌로 송금이에요.',
      ok: '환불 처리',
      cancel: '취소',
    });
    if (!ok) return;
    setBusy(c.orderId);
    try {
      const d = await call('/api/admin/wallet/refund', { orderId: c.orderId });
      setMsg(`환불 처리했어요. ${d.taken}금전을 뺐어요. 이제 스마트로에서 ${won(d.refundWon)}을 취소해 주세요.`);
    } catch (e) {
      setMsg(e.message);
    }
    setBusy('');
  };

  const doDebit = async () => {
    const amount = Number(debit.amount);
    if (!Number.isInteger(amount) || amount < 1) return setMsg('뺄 금전을 1 이상 숫자로 적어 주세요.');
    if (!(await askConfirm({ title: `${name} 님의 금전 ${amount}을 뺄까요?`, message: '도용 결제 회수처럼 환불 계산과 상관없이 빼야 할 때만 써 주세요. 잔액보다 많으면 잔액만큼만 빠져요.', ok: '빼기', cancel: '취소' }))) return;
    setBusy('debit');
    try {
      const d = await call('/api/admin/wallet/debit', debit);
      setMsg(`${d.taken}금전을 뺐어요.`);
      setDebit({ amount: '', memo: '' });
    } catch (e) {
      setMsg(e.message);
    }
    setBusy('');
  };

  if (!plan) return <div className="aw">{msg ? <p className="field-msg">{msg}</p> : <p className="hint">불러오는 중…</p>}</div>;
  const total = plan.charges.reduce((t, c) => t + c.refundable, 0);

  return (
    <div className="aw">
      <ul className="aw-sum">
        <li><span>남은 금전</span><b>{plan.balance.toLocaleString('ko-KR')}</b></li>
        <li><span>쓴 금전</span><b>{plan.used.toLocaleString('ko-KR')}</b></li>
        <li><span>무상 지급</span><b>{plan.free.toLocaleString('ko-KR')}</b></li>
        <li><span>지금 환불하면</span><b className="aw-won">{won(total)}</b></li>
      </ul>
      {msg && <p className="inq-meta" role="status">{msg}</p>}

      <h4 className="aw-h">충전별 환불 계산</h4>
      {plan.charges.length === 0 ? (
        <p className="hint">결제로 충전한 기록이 없어요. 무상 지급 금전은 환불 대상이 아니에요.</p>
      ) : (
        <ul className="aw-charges">
          {plan.charges.map((c) => (
            <li key={c.orderId} className={c.refunded ? 'is-done' : ''}>
              <div className="aw-c-head">
                <b>{won(c.won)}</b>
                <span>{c.credits}금전 · {day(c.at)}{c.method ? ` · ${c.method}` : ''}</span>
                <em className={c.within7 ? 'is-in' : ''}>{c.within7 ? '7일 안' : '7일 지남'}</em>
              </div>
              <p className="aw-calc">
                {c.refunded
                  ? `환불 완료 ${day(c.refundedAt)} · ${won(c.refundWon)}`
                  : `${won(c.won)} − 쓴 ${c.used}금전 × 100원 = ${won(Math.max(0, c.won - c.used * 100))}${c.within7 ? '' : ' → 10% 공제'} → 환불 ${won(c.refundable)} (남은 ${c.left}금전 회수)`}
              </p>
              {!c.refunded && (
                <button type="button" className="btn-ghost aw-btn" disabled={busy === c.orderId} onClick={() => refund(c)}>
                  {busy === c.orderId ? '처리 중…' : '환불 처리'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h4 className="aw-h">금전 빼기 (도용 회수 등)</h4>
      <div className="aw-debit">
        <input className="contact-input" inputMode="numeric" placeholder="금전" value={debit.amount} onChange={(e) => setDebit((d) => ({ ...d, amount: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) }))} aria-label="뺄 금전" />
        <input className="contact-input" placeholder="메모(선택)" maxLength={30} value={debit.memo} onChange={(e) => setDebit((d) => ({ ...d, memo: e.target.value }))} aria-label="메모" />
        <button type="button" className="btn-ghost aw-btn" disabled={busy === 'debit'} onClick={doDebit}>
          {busy === 'debit' ? '빼는 중…' : '빼기'}
        </button>
      </div>

      <h4 className="aw-h">전체 내역 (최근 {plan.ledger.length}건)</h4>
      <ul className="aw-ledger">
        {plan.ledger.map((e, i) => (
          <li key={`${e.at}-${i}`}>
            <span className="aw-kind">{KIND[e.type] || e.type}</span>
            <span className="aw-item">{e.item}<small>{day(e.at)}</small></span>
            <span className={e.amount > 0 ? 'aw-amt is-plus' : 'aw-amt'}>{e.amount > 0 ? '+' : ''}{e.amount}</span>
            <span className="aw-bal">{e.balance}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
