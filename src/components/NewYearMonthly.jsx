// 신년운세 월별 상세 리포트 (유료 — 복채 40천, 2026-11-14). 사주 결과 화면 아래.
// 회원이 이 사람·이 해 상품을 사면(/api/wallet/buy) 1~6월(nym1)·7~12월(nym2)을 동시에 받아 달마다 보여 줌.
// 한 번 산 건 다시 볼 때 복채가 들지 않음(서버 purchases). 받은 풀이는 풀이 기억하기로 다시 부르지 않음.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NEXT_YEAR } from '../lib/topics.js';
import { PRICES, fmtCredits } from '../lib/wallet.js';
import { streamReading, END_MESSAGES } from '../lib/stream.js';
import { localParts, rememberPart, serverParts } from '../lib/history.js';
import Markdown from './Markdown.jsx';
import { trackEvent } from '../lib/analytics.js';

const KEY = 'newyearMonth';
const PARTS = ['nym1', 'nym2'];
const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }));

export default function NewYearMonthly({ input, member, openLogin }) {
  const navigate = useNavigate();
  const price = PRICES.newyearMonth.credits;
  const [state, setState] = useState({ owned: null, balance: 0 });
  const [parts, setParts] = useState({});
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!member) return setState({ owned: false, balance: 0 });
    post('/api/wallet/owned', { item: KEY, input }).then((r) => r.ok && setState({ owned: !!r.data.owned, balance: r.data.balance || 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);

  const load = async () => {
    setOpen(true);
    const memo = localParts(input, KEY);
    const have = Object.fromEntries(PARTS.filter((id) => memo[id]).map((id) => [id, { text: memo[id], status: 'done' }]));
    let todo = PARTS.filter((id) => !have[id]);
    if (todo.length) {
      const srv = await serverParts(input, KEY);
      todo.forEach((id) => {
        if (srv[id]) {
          have[id] = { text: srv[id], status: 'done' };
          rememberPart(input, KEY, id, srv[id]);
        }
      });
      todo = todo.filter((id) => !have[id]);
    }
    setParts(have);
    await Promise.all(
      todo.map(async (id) => {
        const update = (patch) => setParts((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
        update({ text: '', status: 'loading' });
        const r = await streamReading({ input, topic: id, onText: (text) => update({ text }) }).catch(() => ({ error: '네트워크 연결을 확인해 주세요.' }));
        update({ text: r.text || '', status: r.error ? 'error' : 'done', error: r.error, end: r.end });
        if (!r.error && r.text && !r.end) rememberPart(input, KEY, id, r.text, { member: true });
      })
    );
  };

  const buy = async () => {
    if (!member) return openLogin?.(`${NEXT_YEAR} 월별 상세 리포트는 복채로 볼 수 있어요. 로그인해 주세요.`);
    if (state.owned) return load();
    if (state.balance < price) {
      trackEvent('nym_need_credit');
      if (window.confirm(`복채가 ${fmtCredits(price - state.balance)} 모자라요. 충전하러 갈까요? (지금 ${fmtCredits(state.balance)})`)) navigate('/wallet');
      return;
    }
    if (!window.confirm(`${NEXT_YEAR} 월별 상세 리포트에 복채 ${fmtCredits(price)}을 쓸까요? (지금 ${fmtCredits(state.balance)})\n같은 사람의 리포트는 다시 볼 때 복채가 들지 않아요.`)) return;
    setBusy(true);
    const r = await post('/api/wallet/buy', { item: KEY, input });
    setBusy(false);
    if (!r.ok) return window.alert(r.data.error || '열지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    trackEvent('nym_buy');
    setState({ owned: true, balance: r.data.balance });
    load();
  };

  const months = useMemo(() => {
    const out = [];
    PARTS.forEach((id) => {
      const t = parts[id]?.text || '';
      const sp = t.split(/^##\s+(.+)$/m);
      for (let i = 1; i < sp.length; i += 2) out.push({ title: sp[i].trim(), text: (sp[i + 1] || '').trim() });
    });
    return out;
  }, [parts]);
  const loading = PARTS.some((id) => parts[id]?.status === 'loading');
  const failed = PARTS.map((id) => parts[id]).find((p) => p?.status === 'error' || (p?.status === 'done' && p.end && p.end !== 'refusal'));

  return (
    <section className="nym" aria-labelledby="nym-title">
      <div className="nym-head">
        <div>
          <p className="nym-kicker">{state.owned ? '열어 둔 리포트' : '복채로 더 깊이'}</p>
          <h2 id="nym-title">{NEXT_YEAR}년 월별 상세 운세</h2>
          <p className="nym-desc">1월부터 12월까지, 달마다 바뀌는 기운이 내 사주와 어떻게 만나는지 천둥도사가 하나하나 짚어 드려요.</p>
        </div>
        {!open && (
          <button type="button" className="btn-primary nym-btn" onClick={buy} disabled={busy || state.owned === null}>
            {state.owned ? '리포트 보기' : `복채 ${fmtCredits(price)}으로 열기`}
          </button>
        )}
      </div>
      {open && (
        <div className="nym-body">
          {months.map((m) => (
            <article key={m.title} className="nym-month">
              <h3>{m.title}</h3>
              <Markdown text={m.text} />
            </article>
          ))}
          {loading && <p className="hint">천둥도사가 달마다 풀이를 쓰고 있어요…</p>}
          {failed && (
            <div className="notice">
              <p>{failed.error || END_MESSAGES[failed.end] || END_MESSAGES.error}</p>
              <button type="button" className="btn-ghost" onClick={load}>
                다시 받기
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
