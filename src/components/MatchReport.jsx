// 궁합 결과 (/result?v=match) — 2026-11-13
// 두 사람의 일간·오행을 나란히 보여 주고, 천둥도사 풀이(주제 match)를 받아 '## ' 단위로 보여 줌.
// 풀이 끝의 ```json {score, keywords} 로 궁합 점수 원을 그림. 같은 두 사람이면 기억한 풀이를 그대로 씀.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ELEMENT_KO, ELEMENTS } from '../lib/saju.js';
import { streamReading } from '../lib/stream.js';
import { localParts, matchTopic, rememberPart, serverParts } from '../lib/history.js';
import { peekFresh, clearFresh, loadPartnerName } from '../lib/storage.js';
import { presetMain } from '../lib/presetText.js';
import { trackEvent } from '../lib/analytics.js';
import Markdown from './Markdown.jsx';
import { FreshLoader } from './LifeReport.jsx';

// 본문과 끝의 json(점수·키워드) 나누기. 받는 중이면 ``` 뒤는 숨김
function splitMatch(text) {
  const fence = text.indexOf('```');
  if (fence < 0) return { body: text, data: null };
  let data = null;
  const m = text.slice(fence).match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) {
    try {
      data = JSON.parse(m[1]);
    } catch {
      data = null;
    }
  }
  return { body: text.slice(0, fence).trim(), data };
}

function Person({ who, chart, input, hideBirth = false }) {
  const dm = chart.dayMaster;
  return (
    <div className="pair-card">
      <span className="pair-who">{who}</span>
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

export default function MatchReport({ me, partner, meChart, partnerChart, member = false, onResult }) {
  const topic = matchTopic(partner);
  const [text, setText] = useState(() => localParts(me, topic).match || '');
  const [status, setStatus] = useState(text ? 'done' : 'loading');
  const [error, setError] = useState('');
  const [fresh] = useState(peekFresh);
  const [partnerName] = useState(loadPartnerName); // 궁합 초대로 만난 상대면 닉네임 (생년월일은 숨김)
  const abortRef = useRef(null);
  useEffect(() => clearFresh(), []);

  const run = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('loading');
    setError('');
    setText('');
    trackEvent('reading_start', { topic: 'match' });
    try {
      const r = await streamReading({ input: me, partner, topic: 'match', signal: ctrl.signal, onText: setText });
      setText(r.text);
      setStatus(r.error ? 'error' : 'done');
      setError(r.error || '');
      if (!r.error && r.text) rememberPart(me, topic, 'match', r.text, { member, partner });
      trackEvent(r.error ? 'reading_fail' : 'reading_done', { topic: 'match', end: r.end || 'ok' });
    } catch (e) {
      if (e.name !== 'AbortError') {
        setStatus('error');
        setError('네트워크 연결을 확인하고 다시 시도해 주세요.');
      }
    }
  };

  useEffect(() => {
    if (text) return undefined; // 기억한 풀이가 있으면 그대로
    const t = setTimeout(async () => {
      if (member) {
        const srv = (await serverParts(me, topic)).match;
        if (srv) {
          setText(srv);
          setStatus('done');
          rememberPart(me, topic, 'match', srv, { partner });
          return;
        }
      }
      run();
    }, 0);
    return () => {
      clearTimeout(t);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { body, data } = useMemo(() => splitMatch(text), [text]);
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
        {score != null ? <ScoreRing score={score} /> : <div className="match-score is-wait" aria-hidden="true" />}
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
        {status === 'loading' && !body && (
          <div className="loading">
            <span className="moon-spin" aria-hidden="true" />
            천둥도사가 두 원국을 나란히 읽고 있어요…
          </div>
        )}
        {body && <Markdown text={body} />}
        {status === 'loading' && body && <span className="cursor" aria-hidden="true" />}
        {status === 'error' && (
          <div className="notice">
            <p>{error}</p>
            <button className="btn-ghost" onClick={run}>
              다시 시도
            </button>
          </div>
        )}
      </article>
    </>
  );
}
