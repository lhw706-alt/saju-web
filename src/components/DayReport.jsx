// 하루 운세 화면 (/result?v=day&t=today|tomorrow|date) — 2026-11-13
// 레퍼런스(오늘의 운세 화면)처럼 필요한 것만: 위쪽 오늘·내일·지정일 탭 → 큰 점수 + 한 줄 요약 →
// 총운·오전·오후·밤 탭 → 분야별 점수 육각형 그래프 → 고른 탭의 글.
// 풀이는 주제 today·tomorrow·date (topics.js DAY_TOPICS), 맨 앞 json 에 점수·요약·분야별 점수.
// 같은 사람·같은 날이면 기억한 풀이를 그대로 (키 '주제@날짜').
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { streamReading, END_MESSAGES } from '../lib/stream.js';
import { localParts, rememberPart, serverParts } from '../lib/history.js';
import { DAY_TOPICS, dayTopicDate, ymdOf } from '../lib/topics.js';
import { trackEvent } from '../lib/analytics.js';
import Markdown from './Markdown.jsx';
import { FreshLoader } from './LifeReport.jsx';

const AXES = ['총운', '재물운', '연애운', '사업운', '건강운', '학업운'];
const TIMES = ['총운', '오전', '오후', '밤'];
const WEEK = '일월화수목금토';

// 맨 앞 json(점수) 과 '## ' 단락 나누기. 받는 중인 열린 코드블록은 숨김
function parseDay(text) {
  let data = null;
  let body = text.replace(/```(?:json)?\s*([\s\S]*?)```/, (_, j) => {
    try {
      data = JSON.parse(j);
    } catch {
      data = null;
    }
    return '';
  });
  const open = body.indexOf('```');
  if (open >= 0) body = body.slice(0, open);
  const sections = {};
  const parts = body.split(/^##\s+(.+)$/m);
  if (parts[0].trim()) sections['총운'] = parts[0].trim(); // 제목 없이 시작한 글
  for (let i = 1; i < parts.length; i += 2) sections[parts[i].trim()] = (parts[i + 1] || '').trim();
  return { data, sections };
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));

// 점수 대신 보여 줄 말 (2026-11-13 사용자 지시: 숫자보다 '좋음·보통' 같은 말로)
const gradeOf = (s) => (s >= 85 ? '대길' : s >= 70 ? '좋음' : s >= 55 ? '보통' : '조심');

// 분야별 점수 육각형 그래프 (0~100)
function Radar({ scores }) {
  const cx = 160;
  const cy = 150;
  const R = 100;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const ring = (k) => AXES.map((_, i) => pt(i, R * k).join(',')).join(' ');
  const shape = AXES.map((a, i) => pt(i, (R * clamp(scores?.[a], 0, 100)) / 100).join(',')).join(' ');
  return (
    <svg className="day-radar" viewBox="0 0 320 300" role="img" aria-label={`분야별 운: ${AXES.map((a) => `${a} ${clamp(scores?.[a], 0, 100)}점`).join(', ')}`}>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={ring(k)} fill={k === 1 ? 'rgba(255,255,255,0.03)' : 'none'} stroke="rgba(194,196,200,0.18)" strokeDasharray={k === 1 ? '' : '3 4'} />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(194,196,200,0.18)" strokeDasharray="3 4" />;
      })}
      {scores && <polygon className="day-radar-shape" points={shape} fill="rgba(226,194,122,0.28)" stroke="var(--primary)" strokeOpacity="0.75" strokeWidth="1.25" strokeLinejoin="round" />}
      {AXES.map((a, i) => {
        const [x, y] = pt(i, R + 26);
        return (
          <text key={a} x={x} y={y + 5} textAnchor="middle" fill="rgba(226,228,232,0.92)" fontSize="14">
            {a}
          </text>
        );
      })}
    </svg>
  );
}

export default function DayReport({ input, member = false, initial = 'today' }) {
  const navigate = useNavigate();
  const [topic, setTopic] = useState(DAY_TOPICS.some((t) => t.id === initial) ? initial : 'today');
  const [picked, setPicked] = useState('');
  const [pickedFor, setPickedFor] = useState(null);
  const [time, setTime] = useState('총운');
  const [parts, setParts] = useState({}); // '주제@날짜' -> { text, status, error, end }
  const abortRef = useRef(null);
  const [tries, setTries] = useState(0); // 다시 받기

  const date = dayTopicDate(topic, pickedFor);
  const key = date ? `${topic}@${date}` : null;
  const cur = key ? parts[key] : null;

  // 주제·날짜가 정해지면: 기억한 풀이 → (회원) 계정 → 새로 받기
  useEffect(() => {
    if (!key || parts[key]) return undefined;
    const update = (patch) => setParts((p) => ({ ...p, [key]: { ...p[key], ...patch } }));
    const memo = localParts(input, key)[topic];
    if (memo) {
      update({ text: memo, status: 'done', error: '', end: null });
      return undefined;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      update({ text: '', status: 'loading', error: '', end: null });
      if (member) {
        const srv = (await serverParts(input, key))[topic];
        if (srv) {
          rememberPart(input, key, topic, srv);
          return update({ text: srv, status: 'done' });
        }
      }
      trackEvent('reading_start', { topic });
      try {
        const r = await streamReading({ input, topic, date, signal: ctrl.signal, onText: (text) => update({ text }) });
        update({ text: r.text, status: r.error ? 'error' : 'done', error: r.error || '', end: r.end });
        if (!r.error && r.text && !r.end) rememberPart(input, key, topic, r.text, { member });
        trackEvent(r.error ? 'reading_fail' : 'reading_done', { topic, end: r.end || 'ok' });
      } catch (e) {
        if (e.name === 'AbortError') setParts(({ [key]: _drop, ...rest }) => rest);
        else update({ status: 'error', error: '네트워크 연결을 확인하고 다시 시도해 주세요.' });
      }
    }, 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tries]);

  const { data, sections } = useMemo(() => parseDay(cur?.text || ''), [cur?.text]);
  const score = data && Number.isFinite(Number(data.score)) ? clamp(data.score, 0, 100) : null;
  const times = TIMES.filter((t) => sections[t]);
  const shownTime = sections[time] ? time : times[0] || '총운';

  const switchTopic = (id) => {
    if (id === topic) return;
    setTopic(id);
    setTime('총운');
    navigate(`/result?v=day&t=${id}`, { replace: true });
  };
  const retry = () => {
    setParts(({ [key]: _drop, ...rest }) => rest);
    setTries((n) => n + 1);
  };

  const today = ymdOf();
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 365);
    return ymdOf(d);
  })();
  const pickOk = /^\d{4}-\d{2}-\d{2}$/.test(picked) && picked >= today && picked <= maxDate;
  const dateTitle = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return `${m}월 ${d}일 ${WEEK[new Date(y, m - 1, d).getDay()]}요일`;
  };

  return (
    <>
      <FreshLoader />
      <nav className="day-tabs" aria-label="하루 운세 종류">
        {DAY_TOPICS.map((t) => (
          <button key={t.id} type="button" className={topic === t.id ? 'on' : ''} aria-current={topic === t.id ? 'page' : undefined} onClick={() => switchTopic(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {topic === 'date' && (
        <form
          className="day-pick card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!pickOk) return;
            setTime('총운');
            setPickedFor(picked);
          }}
        >
          <label htmlFor="day-pick" className="day-pick-label">
            운세를 볼 날을 골라 주세요 <small>오늘부터 1년 안의 날을 볼 수 있어요</small>
          </label>
          <div className="day-pick-row">
            <span className="input">
              <input id="day-pick" type="date" min={today} max={maxDate} value={picked} onChange={(e) => setPicked(e.target.value)} required />
            </span>
            <button type="submit" className="btn-primary inline" disabled={!pickOk}>
              이 날 운세 보기
            </button>
          </div>
        </form>
      )}

      {date && (
        <section className="day-top">
          <p className="day-date">{dateTitle(date)}</p>
          <div className="day-score" aria-live="polite">
            {score != null ? (
              <b aria-label={`오늘의 기운 ${gradeOf(score)}`}>
                {gradeOf(score)}
                <i aria-hidden="true" />
              </b>
            ) : (
              <span className="day-score-wait" aria-label="점수를 계산하는 중">
                <span className="moon-spin" aria-hidden="true" />
              </span>
            )}
          </div>
          <p className="day-summary">{data?.summary || (cur?.status === 'loading' ? '천둥도사가 그날의 기운을 읽고 있어요…' : '')}</p>
        </section>
      )}

      {date && (
        <section className="day-body">
          <div className="day-times" role="tablist" aria-label="때별 운세">
            {TIMES.map((t) => (
              <button key={t} type="button" role="tab" aria-selected={shownTime === t} className={shownTime === t ? 'on' : ''} disabled={!sections[t]} onClick={() => setTime(t)}>
                {t}
              </button>
            ))}
          </div>
          {/* 오전·오후·밤은 그 시간대 그래프 (예전에 기억한 풀이처럼 없으면 하루 전체 그래프) */}
          <Radar scores={(shownTime !== '총운' && data?.times?.[shownTime]) || data?.scores} />
          <article className="day-text" aria-busy={cur?.status === 'loading'}>
            <h2>{shownTime}</h2>
            {sections[shownTime] ? <Markdown text={sections[shownTime]} /> : cur?.status === 'loading' ? <p className="hint">풀이를 받는 중이에요…</p> : null}
            {cur?.status === 'loading' && sections[shownTime] && <span className="cursor" aria-hidden="true" />}
            {(cur?.status === 'error' || (cur?.status === 'done' && cur.end && cur.end !== 'refusal')) && (
              <div className="notice">
                <p>{cur.status === 'error' ? cur.error : END_MESSAGES[cur.end] || END_MESSAGES.error}</p>
                <button type="button" className="btn-ghost" onClick={retry}>
                  다시 받기
                </button>
              </div>
            )}
          </article>
        </section>
      )}
    </>
  );
}
