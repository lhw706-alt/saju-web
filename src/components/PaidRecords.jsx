// 마이페이지 '풀이 기록' (2026-11-15 사용자 지시) — 복채로 본 타로·신년운세 풀이를 다시 봄. 서버 /api/records (회원 본인만, 탈퇴하면 지움).
// 줄을 누르면 바로 아래로 펼침. 복채 충전·사용 내역은 /wallet.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Markdown from './Markdown.jsx';
import { splitSections } from './NewYearMonthly.jsx';
import { fmtCredits } from '../lib/wallet.js';
import { trackEvent } from '../lib/analytics.js';

const dateOf = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
};
const cardsText = (cards = []) => cards.map((c) => `${c.name}${c.rev ? '(역)' : ''}`).join(' · ');

function Body({ r }) {
  if (r.kind === 'tarot')
    return (
      <div className="rec-body">
        {r.question && <p className="rec-q">질문: {r.question}</p>}
        <p className="rec-cards">{(r.cards || []).map((c) => `${c.pos} ${c.name} ${c.rev ? '역방향' : '정방향'}`).join(' / ')}</p>
        <Markdown text={r.text} />
      </div>
    );
  const p = r.parts || {};
  if (r.kind === 'life')
    return (
      <div className="rec-body">
        {['life1', 'life2', 'life3', 'life4'].filter((id) => p[id]).map((id) => (
          <Markdown key={id} text={p[id].replace(/```json[\s\S]*?```/g, '').trim()} />
        ))}
        {!['life1', 'life2', 'life3', 'life4'].some((id) => p[id]) && <p className="rec-q">아직 받은 풀이가 없어요. 사주 결과 화면에서 평생 사주를 다시 열면 이어서 받아요.</p>}
      </div>
    );
  const months = [...splitSections(p.nym1), ...splitSections(p.nym2)];
  return (
    <div className="rec-body">
      {p.newyear && (
        <>
          <h3>한 해의 흐름</h3>
          <Markdown text={p.newyear} />
        </>
      )}
      {months.map((m) => (
        <div key={m.title}>
          <h3>{m.title}</h3>
          <Markdown text={m.text} />
        </div>
      ))}
      {!p.newyear && !months.length && <p className="rec-q">아직 받은 풀이가 없어요. 사주 결과 화면에서 신년운세를 다시 열면 이어서 받아요.</p>}
    </div>
  );
}

export default function PaidRecords() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    fetch('/api/records', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || '기록을 불러오지 못했어요.');
        setList(d.records || []);
      })
      .catch((e) => setErr(e.message || '기록을 불러오지 못했어요.'));
    trackEvent('records_view');
  }, []);

  const remove = async (id) => {
    if (!window.confirm('이 풀이 기록을 지울까요? 지운 기록은 되돌릴 수 없어요.')) return;
    const r = await fetch('/api/records', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => null);
    if (!r?.ok) return window.alert('지우지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    setList((l) => l.filter((x) => x.id !== id));
    setOpen(null);
  };

  return (
    <section aria-labelledby="rec-title">
      <div className="rec-head">
        <h2 id="rec-title">풀이 기록</h2>
      </div>
      <p className="my-sec-note">복채로 본 타로·신년운세·평생 사주 풀이가 여기에 남아요.</p>
      {err && <p className="rec-empty">{err}</p>}
      {!err && list === null && <p className="rec-empty">불러오는 중이에요…</p>}
      {list && list.length === 0 && (
        <div className="rec-empty">
          <p>아직 기록이 없어요. 운세를 보러 갈까요?</p>
          <Link to="/#saju" className="rec-go">
            운세 보러 가기
          </Link>
        </div>
      )}
      {list && list.length > 0 && (
        <ul className="rec-list">
          {list.map((r) => {
            const on = open === r.id;
            const title = r.kind === 'tarot' ? `${r.topic}${r.question ? ` — ${r.question}` : ''}` : r.kind === 'life' ? '평생 사주 리포트' : `${r.year}년 신년운세`;
            const sub = r.kind === 'tarot' ? `${dateOf(r.at)} · ${r.spread === 3 ? '세 장' : '한 장'} · ${cardsText(r.cards)}` : r.kind === 'life' ? `${dateOf(r.at)} · 성향·재물·직업·연애·건강·대운` : `${dateOf(r.at)} · 한 해 흐름 + 월별 상세`;
            return (
              <li key={r.id} className={`rec-item${on ? ' on' : ''}`}>
                <button type="button" className="rec-row" aria-expanded={on} onClick={() => setOpen(on ? null : r.id)}>
                  <span className="rec-kind">{r.kind === 'tarot' ? '타로' : r.kind === 'life' ? '평생 사주' : '신년운세'}</span>
                  <span className="rec-main">
                    <span className="rec-title">{title}</span>
                    <span className="rec-sub">
                      {sub}
                      {r.credits ? ` · ${fmtCredits(r.credits)}` : ''}
                    </span>
                  </span>
                  <span className="rec-arrow" aria-hidden="true">
                    ▾
                  </span>
                </button>
                {on && (
                  <>
                    <Body r={r} />
                    <button type="button" className="rec-del" onClick={() => remove(r.id)}>
                      이 기록 지우기
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
