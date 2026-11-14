// 마이페이지 '풀이 기록' (2026-11-15 사용자 지시) — 복채로 본 타로·신년운세·평생 사주 풀이를 다시 봄. 서버 /api/records (회원 본인만, 탈퇴하면 지움).
// 다른 사람 풀이도 함께 남고, 위쪽 드롭다운으로 '나'·'1990년생 · 여성' 같은 사람별·타로만 거를 수 있음.
// 평생 사주·신년운세는 펼치면 항목 탭(1. 타고난 사주와 기본 성향, 재물운 …)으로 원하는 부분만 바로 봄.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Markdown from './Markdown.jsx';
import { GlossaryProvider } from './Glossary.jsx';
import { splitSections } from './NewYearMonthly.jsx';
import { fmtCredits } from '../lib/wallet.js';
import { trackEvent } from '../lib/analytics.js';
import { askConfirm, showAlert } from './ConfirmHost.jsx';

const dateOf = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
};
const cardsText = (cards = []) => cards.map((c) => `${c.name}${c.rev ? '(역)' : ''}`).join(' · ');
const JSON_BLOCK = /```json[\s\S]*?```/g;

// 평생 사주·신년운세 → [{ title, text }] 항목들
function sectionsOf(r) {
  const p = r.parts || {};
  if (r.kind === 'life') return ['life1', 'life2', 'life3', 'life4'].flatMap((id) => splitSections((p[id] || '').replace(JSON_BLOCK, '')));
  return [...(p.newyear ? [{ title: '한 해의 흐름', text: p.newyear.replace(JSON_BLOCK, '') }] : []), ...splitSections(p.nym1), ...splitSections(p.nym2)];
}

function Body({ r }) {
  const secs = useMemo(() => (r.kind === 'tarot' ? [] : sectionsOf(r)), [r]);
  const [tab, setTab] = useState(0);
  if (r.kind === 'tarot')
    return (
      <div className="rec-body">
        {r.question && <p className="rec-q">질문: {r.question}</p>}
        <p className="rec-cards">{(r.cards || []).map((c) => `${c.pos} ${c.name} ${c.rev ? '역방향' : '정방향'}`).join(' / ')}</p>
        <Markdown text={r.text} />
      </div>
    );
  if (!secs.length)
    return (
      <div className="rec-body">
        <p className="rec-q">아직 받은 풀이가 없어요. 사주 결과 화면에서 다시 열면 이어서 받아요.</p>
      </div>
    );
  const cur = secs[Math.min(tab, secs.length - 1)];
  return (
    <div className="rec-body">
      <div className="rec-tabs" role="tablist" aria-label="풀이 항목">
        {secs.map((s, i) => (
          <button key={`${s.title}-${i}`} type="button" role="tab" aria-selected={i === tab} className={i === tab ? 'on' : ''} onClick={() => setTab(i)}>
            {s.title}
          </button>
        ))}
      </div>
      <h3 className="rec-sec-title">{cur.title}</h3>
      <Markdown text={cur.text} />
    </div>
  );
}

export default function PaidRecords() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);
  const [who, setWho] = useState('all');
  const [onlyMe, setOnlyMe] = useState(false); // 나만 보기 토글

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

  const labelOf = (r) => (r.kind === 'tarot' ? '타로' : r.who || '이전 기록');
  // 거르기: 전체 · 나 · 사람별 · 타로
  // 사람 유형별 카드 (2026-11-15 사용자 지시: 드롭다운 대신) — 전체 · 나 · 1990년생 · 여성 … · 타로, 카드마다 기록 수
  const groups = useMemo(() => {
    const count = {};
    (list || []).forEach((r) => (count[labelOf(r)] = (count[labelOf(r)] || 0) + 1));
    const order = (a) => (a === '나' ? 0 : a === '타로' ? 3 : a === '이전 기록' ? 2 : 1);
    const names = Object.keys(count).sort((a, b) => order(a) - order(b) || a.localeCompare(b));
    return [{ id: 'all', label: '전체', n: (list || []).length }, ...names.map((k) => ({ id: k, label: k, n: count[k] }))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);
  const active = onlyMe ? '나' : who;
  const shown = (list || []).filter((r) => active === 'all' || labelOf(r) === active);

  const remove = async (id) => {
    if (!(await askConfirm({ title: '이 풀이 기록을 지울까요?', message: '지운 기록은 되돌릴 수 없어요.', ok: '지우기' }))) return;
    const r = await fetch('/api/records', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => null);
    if (!r?.ok) return showAlert('지우지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    setList((l) => l.filter((x) => x.id !== id));
    setOpen(null);
  };

  return (
    <GlossaryProvider>
      <section aria-labelledby="rec-title">
        <div className="rec-head">
          <h2 id="rec-title">풀이 기록</h2>
          {list && list.length > 0 && (
            <label className="toggle">
              <input type="checkbox" role="switch" checked={onlyMe} onChange={(e) => setOnlyMe(e.target.checked)} />
              <span className="toggle-track" aria-hidden="true">
                <span className="toggle-knob" />
              </span>
              <span className="toggle-label">나만 보기</span>
            </label>
          )}
        </div>
        {list && list.length > 0 && groups.length > 2 && !onlyMe && (
          <div className="rec-groups" role="tablist" aria-label="누구의 풀이인지">
            {groups.map((g) => (
              <button key={g.id} type="button" role="tab" aria-selected={who === g.id} className={`rec-group${who === g.id ? ' on' : ''}`} onClick={() => setWho(g.id)}>
                <span>{g.label}</span>
                <b>{g.n}</b>
              </button>
            ))}
          </div>
        )}
        {onlyMe && shown.length === 0 && <p className="rec-empty">내 사주 정보로 본 풀이가 아직 없어요. 마이페이지 ‘내 사주 정보’에 등록한 정보로 보면 여기에 모여요.</p>}
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
            {shown.map((r) => {
              const on = open === r.id;
              const title = r.kind === 'tarot' ? `${r.topic}${r.question ? ` — ${r.question}` : ''}` : r.kind === 'life' ? '평생 사주 리포트' : `${r.year}년 신년운세`;
              const sub = r.kind === 'tarot' ? `${dateOf(r.at)} · ${r.spread === 3 ? '세 장' : '한 장'} · ${cardsText(r.cards)}` : `${dateOf(r.at)}${r.who ? ` · ${r.who}` : ''}`;
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
    </GlossaryProvider>
  );
}
