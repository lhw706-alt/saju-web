// 궁합 결과 (/result?v=match) — 2026-11-13
// 두 사람의 일간·오행을 나란히 보여 주고, 천둥도사 풀이(주제 match)를 받아 '## ' 단위로 보여 줌.
// 풀이 끝의 ```json {score, keywords} 로 궁합 점수 원을 그림. 같은 두 사람이면 기억한 풀이를 그대로 씀.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ELEMENT_KO, ELEMENTS } from '../lib/saju.js';
import { streamReading, END_MESSAGES } from '../lib/stream.js';
import { localParts, matchTopic, rememberPart, serverParts } from '../lib/history.js';
import { peekFresh, clearFresh, loadPartnerName } from '../lib/storage.js';
import { presetMain } from '../lib/presetText.js';
import { trackEvent } from '../lib/analytics.js';
import Markdown from './Markdown.jsx';
import { dosaGenderSvg } from '../brand/dosaArt.js';
import { MATCH_PARTS } from '../lib/topics.js';
import { FreshLoader } from './LifeReport.jsx';

const GENDER_ART = { male: dosaGenderSvg('male'), female: dosaGenderSvg('female') };
const PART_IDS = MATCH_PARTS.map((p) => p.id);

// 본문과 json(점수·키워드) 나누기 — json 은 첫 부분 맨 앞(예전 풀이는 맨 끝). 받는 중인 열린 코드블록은 숨김
function splitMatch(text) {
  let data = null;
  let body = text.replace(/```(?:json)?\s*([\s\S]*?)```/, (_, j) => {
    try {
      data = JSON.parse(j);
    } catch {
      data = null;
    }
    return "";
  });
  const open = body.indexOf("```");
  if (open >= 0) body = body.slice(0, open);
  return { body: body.trim(), data };
}

function Person({ who, chart, input, hideBirth = false }) {
  const dm = chart.dayMaster;
  return (
    <div className="pair-card">
      <span className="pair-who">{who}</span>
      {/* 성별에 맞는 천둥도사 (남: 갓·파란 옷고름, 여: 꽃 비녀·붉은 옷고름) */}
      <span className="pair-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: GENDER_ART[input.gender === 'female' ? 'female' : 'male'] }} />
      <span className={`pair-dm el-${dm.element}`}>{dm.stem}</span>
      <b>
        {dm.ko}
        {ELEMENT_KO[dm.element]} 일간
      </b>
      {!hideBirth && <span className="pair-sub">{presetMain(input)}</span>}
      <ul className="pair-el" aria-label="오행 개수">
        {ELEMENTS.map((e) => (
          <li key={e} className={`el-${e}`}>
            {ELEMENT_KO[e]} <b>{chart.elements[e]}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreRing({ score }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="match-score" role="img" aria-label={`궁합 점수 ${score}점`}>
      <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--primary)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 66 66)" />
      </svg>
      <span className="match-score-num">
        <b>{score}</b>점
      </span>
    </div>
  );
}

// 풀이 한 부분: 받는 중 커서, 오류·중간에 끊김이면 안내 + 다시 받기
// wait: 앞부분이 아직 안 왔으면 뒷부분 글은 잠시 숨김 (순서가 뒤바뀌어 보이지 않게)
function PartBody({ part, text, onRetry, wait = false }) {
  if (wait && part.status !== 'error') return null;
  const cut = part.status === 'done' && part.end && part.end !== 'refusal';
  return (
    <>
      {text && <Markdown text={text} />}
      {part.status === 'loading' && text && <span className="cursor" aria-hidden="true" />}
      {(part.status === 'error' || cut) && (
        <div className="notice">
          <p>{part.status === 'error' ? part.error : END_MESSAGES[part.end] || END_MESSAGES.error}</p>
          <button type="button" className="btn-ghost" onClick={onRetry}>
            이 부분 다시 받기
          </button>
        </div>
      )}
    </>
  );
}

export default function MatchReport({ me, partner, meChart, partnerChart, member = false, onResult }) {
  const topic = matchTopic(partner);
  // 두 부분(match1·match2)을 동시에 받음. 기억한 부분은 그대로 (끝까지 받은 것만 기억함)
  const [parts, setParts] = useState(() => {
    const saved = localParts(me, topic);
    return Object.fromEntries(PART_IDS.filter((id) => saved[id]).map((id) => [id, { text: saved[id], status: 'done', error: '', end: null }]));
  });
  const [fresh] = useState(peekFresh);
  const [partnerName] = useState(loadPartnerName); // 궁합 초대로 만난 상대면 닉네임 (생년월일은 숨김)
  const abortRef = useRef(null);
  useEffect(() => clearFresh(), []);

  const run = (ids) => {
    const ctrl = abortRef.current || new AbortController();
    abortRef.current = ctrl;
    trackEvent('reading_start', { topic: 'match' });
    ids.forEach(async (id) => {
      const update = (patch) => setParts((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
      update({ text: '', status: 'loading', error: '', end: null });
      try {
        const r = await streamReading({ input: me, partner, topic: id, signal: ctrl.signal, onText: (text) => update({ text }) });
        update({ text: r.text, status: r.error ? 'error' : 'done', error: r.error || '', end: r.end });
        // 시간 초과 등으로 중간에 끊긴 글은 기억하지 않음 (다시 보면 새로 받음)
        if (!r.error && r.text && !r.end) rememberPart(me, topic, id, r.text, { member, partner });
        trackEvent(r.error ? 'reading_fail' : 'reading_done', { topic: id, end: r.end || 'ok' });
      } catch (e) {
        if (e.name !== 'AbortError') update({ status: 'error', error: '네트워크 연결을 확인하고 다시 시도해 주세요.' });
      }
    });
  };
  const retry = (id) => {
    abortRef.current = null;
    run([id]);
  };

  useEffect(() => {
    const t = setTimeout(async () => {
      let todo = PART_IDS.filter((id) => !parts[id]);
      if (!todo.length) return; // 기억한 풀이가 있으면 그대로
      if (member) {
        const srv = await serverParts(me, topic);
        const found = todo.filter((id) => srv[id]);
        if (found.length) {
          setParts((p) => ({ ...p, ...Object.fromEntries(found.map((id) => [id, { text: srv[id], status: 'done', error: '', end: null }])) }));
          found.forEach((id) => rememberPart(me, topic, id, srv[id], { partner }));
          todo = todo.filter((id) => !srv[id]);
        }
      }
      if (todo.length) run(todo);
    }, 0);
    return () => {
      clearTimeout(t);
      abortRef.current?.abort();
      abortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p1 = parts.match1 || { status: 'loading', text: '' };
  const p2 = parts.match2 || { status: 'loading', text: '' };
  const status = p1.status === 'loading' || p2.status === 'loading' ? 'loading' : 'done';
  const first = useMemo(() => splitMatch(p1.text || ''), [p1.text]);
  const body = first.body;
  const data = first.data;

  const score = Number.isFinite(data?.score) ? Math.round(data.score) : null;
  useEffect(() => {
    if (score != null) onResult?.(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  return (
    <>
      {fresh && <FreshLoader />}
      <section className="result-head">
        <p className="eyebrow">두 사람의 궁합</p>
        <h1 className="result-title">천둥도사가 본 우리 궁합</h1>
      </section>
      <div className="pair-row">
        <Person who="나" chart={meChart} input={me} />
        <span className="pair-and" aria-hidden="true">合</span>
        <Person who={partnerName || '상대'} chart={partnerChart} input={partner} hideBirth={!!partnerName} />
      </div>

      <section className="match-top card">
        {score != null ? <ScoreRing score={score} /> : p1.status === 'loading' ? <div className="match-score is-wait" aria-hidden="true" /> : null}
        <div className="match-keys">
          {data?.keywords?.length ? (
            <ul>
              {data.keywords.slice(0, 4).map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          ) : (
            <p className="hint">{status === 'loading' ? '천둥도사가 두 사람의 기운을 맞춰 보는 중이에요…' : ''}</p>
          )}
          <p className="match-note">점수는 두 사람의 원국이 얼마나 조화로운지 본 상대적인 값이에요.</p>
        </div>
      </section>

      <article className="reading-body card match-body" aria-live="polite" aria-busy={status === 'loading'}>
        {!body && !p2.text && status === 'loading' && (
          <div className="loading">
            <span className="moon-spin" aria-hidden="true" />
            천둥도사가 두 원국을 나란히 읽고 있어요…
          </div>
        )}
        <PartBody part={p1} text={body} onRetry={() => retry('match1')} />
        <PartBody part={p2} text={p2.text} onRetry={() => retry('match2')} wait={!body && p1.status === 'loading'} />
      </article>
    </>
  );
}
