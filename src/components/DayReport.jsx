// 하루 운세 화면 (/result?v=day&t=today|tomorrow|date) — 2026-11-13
// 위쪽 탭 두 개: 그날 운세(오늘·내일·지정일 중 고른 것) | 띠 운세. 들어오면 두 풀이를 함께 요청.
// 그날 운세: 천둥도사 + 점수 + 한 줄 요약 → 분야별 육각형 그래프 → 오전·오후·밤 원형 그래프 → 총운·오전·오후·밤 탭 글.
// 띠 운세(topics.js TTI_TOPIC): 점수 + 요약 → 행운 포인트(색·숫자·방향) → 띠 운세 글 → 한 줄 조언.
// 같은 사람·같은 날이면 기억한 풀이를 그대로 (키 주제@날짜, tti@날짜).
import { useEffect, useMemo, useState } from 'react';
import { streamReading, END_MESSAGES } from '../lib/stream.js';
import { localParts, rememberPart, serverParts } from '../lib/history.js';
import { DAY_TOPICS, dayTopicDate, ymdOf, ttiYears } from '../lib/topics.js';
import { trackEvent } from '../lib/analytics.js';
import Markdown from './Markdown.jsx';
import { FreshLoader } from './LifeReport.jsx';
import { dosaFaceSvg } from '../brand/dosaArt.js';
import { computeSaju } from '../lib/saju.js';
import { zodiacSvg } from '../brand/zodiacArt.js';

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
  if (open >= 0) {
    // json 이 아직 다 오지 않았어도 점수·요약은 먼저 보여 줌 (기다리는 시간 줄이기)
    const head = body.slice(open);
    const sc = /"score"\s*:\s*(\d+)/.exec(head);
    const su = /"summary"\s*:\s*"([^"]+)"/.exec(head);
    if (!data && (sc || su)) data = { score: sc ? Number(sc[1]) : undefined, summary: su ? su[1] : undefined };
    body = body.slice(0, open);
  }
  const sections = {};
  const parts = body.split(/^##\s+(.+)$/m);
  if (parts[0].trim()) sections['총운'] = parts[0].trim(); // 제목 없이 시작한 글
  for (let i = 1; i < parts.length; i += 2) sections[parts[i].trim()] = (parts[i + 1] || '').trim();
  return { data, sections };
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));

// 점수 옆 천둥도사 표정 (2026-11-13 사용자 지시: 등급 글자·금색 원 대신 캐릭터 + 점수). 낮아도 겁주지 않는 차분한 얼굴
const faceOf = (s) =>
  s >= 85 ? { eyes: 'happy', mouth: 'open' }
  : s >= 70 ? { eyes: 'dot', mouth: 'smile', brows: 'soft' }
  : s >= 55 ? { eyes: 'closed', mouth: 'smile' }
  : { eyes: 'dot', mouth: 'flat', brows: 'soft' };
// 시간대 점수(times)가 없는 예전 풀이는 기억에서 꺼내지 않고 새로 받음
const hasTimes = (t) => typeof t === 'string' && t.includes('"times"');

// 시간대 점수: 숫자 (예전 풀이는 분야별 객체 → 그 안의 총운)
const timeScore = (v) => (v && typeof v === 'object' ? v['총운'] : v);

// 오전·오후·밤 원형 진행 그래프 (한 번에 보여 줌, 누르면 그때의 글로)
function TimeRings({ times, current, onPick }) {
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <div className="day-rings">
      {['오전', '오후', '밤'].map((t) => {
        const v = times ? clamp(timeScore(times[t]), 0, 100) : null;
        return (
          <button key={t} type="button" className={`day-ring${current === t ? ' on' : ''}`} onClick={() => onPick(t)} aria-label={v != null ? `${t} ${v}점, 글 보기` : `${t} 글 보기`}>
            <svg viewBox="0 0 76 76" aria-hidden="true">
              <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(194,196,200,0.16)" strokeWidth="6" />
              {v != null && (
                <circle cx="38" cy="38" r={R} fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(C * v) / 100} ${C}`} transform="rotate(-90 38 38)" />
              )}
              <text x="38" y="44" textAnchor="middle" fill="var(--text)" fontSize="18" fontWeight="600">{v ?? '–'}</text>
            </svg>
            <span>{t}</span>
          </button>
        );
      })}
    </div>
  );
}

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

// 풀이 한 개 받기: 기억한 풀이 → (회원) 계정 → 새로 받기. valid: 기억한 풀이를 써도 되는지
function useDayPart(input, member, id, date, valid) {
  const [parts, setParts] = useState({}); // '주제@날짜' -> { text, status, error, end }
  const [tries, setTries] = useState(0);
  const key = date ? `${id}@${date}` : null;

  useEffect(() => {
    if (!key || parts[key]) return undefined;
    const update = (patch) => setParts((p) => ({ ...p, [key]: { ...p[key], ...patch } }));
    const memo = localParts(input, key)[id];
    if (valid(memo)) {
      update({ text: memo, status: 'done', error: '', end: null });
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      update({ text: '', status: 'loading', error: '', end: null });
      if (member) {
        const srv = (await serverParts(input, key))[id];
        if (valid(srv)) {
          rememberPart(input, key, id, srv);
          return update({ text: srv, status: 'done' });
        }
      }
      trackEvent('reading_start', { topic: id });
      try {
        const r = await streamReading({ input, topic: id, date, signal: ctrl.signal, onText: (text) => update({ text }) });
        update({ text: r.text, status: r.error ? 'error' : 'done', error: r.error || '', end: r.end });
        if (!r.error && r.text && !r.end) rememberPart(input, key, id, r.text, { member });
        trackEvent(r.error ? 'reading_fail' : 'reading_done', { topic: id, end: r.end || 'ok' });
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

  const retry = () => {
    setParts(({ [key]: _drop, ...rest }) => rest);
    setTries((n) => n + 1);
  };
  return [key ? parts[key] : null, retry];
}

// 점수 + 천둥도사 + 한 줄 요약
// artOf(score) → 점수 위에 놓을 그림 SVG (그날 운세 = 천둥도사, 띠 운세 = 내 띠 십이지신)
function ScoreHead({ date, data, cur, artOf, sub }) {
  const score = data && Number.isFinite(Number(data.score)) ? clamp(data.score, 0, 100) : null;
  return (
    <section className="day-top">
      <p className="day-date">{sub || dateTitle(date)}</p>
      <div className="day-score" aria-live="polite">
        {score != null ? (
          <>
            <span className="day-dosa" aria-hidden="true" dangerouslySetInnerHTML={{ __html: artOf(score) }} />
            <b>
              {score}
              <small>점</small>
            </b>
          </>
        ) : (
          <span className="day-score-wait" aria-label="점수를 계산하는 중">
            <span className="moon-spin" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="day-summary">{data?.summary || (cur?.status === 'loading' ? '천둥도사가 그날의 기운을 읽고 있어요…' : '')}</p>
    </section>
  );
}

function EndNotice({ cur, retry }) {
  if (!(cur?.status === 'error' || (cur?.status === 'done' && cur.end && cur.end !== 'refusal'))) return null;
  return (
    <div className="notice">
      <p>{cur.status === 'error' ? cur.error : END_MESSAGES[cur.end] || END_MESSAGES.error}</p>
      <button type="button" className="btn-ghost" onClick={retry}>
        다시 받기
      </button>
    </div>
  );
}

// 지정일로 볼 수 있는 날인지 (오늘 ~ 1년 뒤)
export const dayInRange = (ymd) => {
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const d = new Date();
  d.setDate(d.getDate() + 365);
  return ymd >= ymdOf() && ymd <= ymdOf(d);
};
const dateTitle = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${m}월 ${d}일 ${WEEK[new Date(y, m - 1, d).getDay()]}요일`;
};
const ANIMAL_BRANCH = { 쥐: '子', 소: '丑', 호랑이: '寅', 토끼: '卯', 용: '辰', 뱀: '巳', 말: '午', 양: '未', 원숭이: '申', 닭: '酉', 개: '戌', 돼지: '亥' };

// pickedDate: 지정일 운세에서 입력 화면(/start)에서 고른 날 (주소 &d=YYYY-MM-DD). 있으면 날짜 칸 없이 바로 풀이
export default function DayReport({ input, member = false, initial = 'today', pickedDate = null }) {
  const topic = DAY_TOPICS.some((t) => t.id === initial) ? initial : 'today';
  const label = DAY_TOPICS.find((t) => t.id === topic).label;
  const [view, setView] = useState('day'); // 위쪽 탭: 'day'(그날 운세) | 'tti'(띠 운세)
  const [picked, setPicked] = useState('');
  const [pickedFor, setPickedFor] = useState(() => (topic === 'date' && dayInRange(pickedDate) ? pickedDate : null));
  const [time, setTime] = useState('총운');

  const date = dayTopicDate(topic, pickedFor);
  // 두 풀이를 함께 요청 (탭을 바꿔도 기다리지 않게)
  const [cur, retry] = useDayPart(input, member, topic, date, hasTimes);
  const [ttiCur, ttiRetry] = useDayPart(input, member, 'tti', date, (t) => typeof t === 'string' && t.includes('년생')); // 나이별 운세 없는 예전 풀이는 새로 받음

  const { data, sections } = useMemo(() => parseDay(cur?.text || ''), [cur?.text]);
  const tti = useMemo(() => parseDay(ttiCur?.text || ''), [ttiCur?.text]);
  const times = TIMES.filter((t) => sections[t]);
  const shownTime = sections[time] ? time : times[0] || '총운';

  const animal = useMemo(() => {
    try {
      const c = computeSaju(input);
      return { name: c.animal, year: c.solarDate.slice(0, 4) };
    } catch {
      return null;
    }
  }, [input]);

  const today = ymdOf();
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 365);
    return ymdOf(d);
  })();
  const pickOk = /^\d{4}-\d{2}-\d{2}$/.test(picked) && picked >= today && picked <= maxDate;
  // 같은 띠 출생 연도 (08년생 → 96년생 → …) 와 그중 내 해
  const years = animal && date ? ttiYears(animal.name, date) : [];
  const mineYear = animal ? (years.find((y) => Math.abs(y - Number(animal.year)) <= 1) ?? null) : null;
  const mineYY = mineYear != null ? String(mineYear).slice(2) : null;

  return (
    <>
      {/* 로딩은 보고 있는 탭의 점수·요약이 나오면 끝 (날짜를 아직 안 골랐으면 바로) */}
      <FreshLoader
        ready={
          !date ||
          (view === 'tti'
            ? !!tti.data?.summary || (!!ttiCur && ttiCur.status !== 'loading')
            : !!data?.summary || data?.score != null || (!!cur && cur.status !== 'loading'))
        }
      />
      <nav className="day-tabs" role="tablist" aria-label="운세 종류">
        {[
          ['day', label],
          ['tti', '띠 운세'],
        ].map(([v, l]) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
            {l}
          </button>
        ))}
      </nav>

      {topic === 'date' && !pickedFor && (
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

      {date && view === 'day' && (
        <>
          <ScoreHead date={date} data={data} cur={cur} artOf={(sc) => dosaFaceSvg(faceOf(sc), topic)} />
          <section className="day-body">
            <h2 className="day-sub">분야별 운</h2>
            <Radar scores={data?.scores} />
            <h2 className="day-sub">때별 운</h2>
            <TimeRings times={data?.times} current={shownTime} onPick={(t) => sections[t] && setTime(t)} />
            <div className="day-times" role="tablist" aria-label="때별 운세">
              {TIMES.map((t) => (
                <button key={t} type="button" role="tab" aria-selected={shownTime === t} className={shownTime === t ? 'on' : ''} disabled={!sections[t]} onClick={() => setTime(t)}>
                  {t}
                </button>
              ))}
            </div>
            <article className="day-text" aria-busy={cur?.status === 'loading'}>
              <h2>{shownTime}</h2>
              {sections[shownTime] ? <Markdown text={sections[shownTime]} /> : cur?.status === 'loading' ? <p className="hint">풀이를 받는 중이에요…</p> : null}
              {cur?.status === 'loading' && sections[shownTime] && <span className="cursor" aria-hidden="true" />}
              <EndNotice cur={cur} retry={retry} />
            </article>
          </section>
        </>
      )}

      {date && view === 'tti' && (
        <>
          <section className="day-top tti-top">
            <p className="day-date">{dateTitle(date)}</p>
            {animal && (
              <>
                <span className="tti-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: zodiacSvg(animal.name, 'good') }} />
                <p className="tti-name">
                  {animal.name}띠 <span className="tti-han">{ANIMAL_BRANCH[animal.name]}</span>
                </p>
                <p className="tti-years">{years.map((y) => `${String(y).slice(2)}년생`).join(' · ')}</p>
              </>
            )}
            <p className="day-summary">{tti.data?.summary || (ttiCur?.status === 'loading' ? '천둥도사가 그날의 띠 기운을 읽고 있어요…' : '')}</p>
          </section>
          <section className="day-body">
            {tti.data?.lucky && <LuckyPoints lucky={tti.data.lucky} />}
            <article className="day-text" aria-busy={ttiCur?.status === 'loading'}>
              <h2>띠 운세</h2>
              {tti.sections['띠 운세'] ? <Markdown text={tti.sections['띠 운세']} /> : ttiCur?.status === 'loading' ? <p className="hint">풀이를 받는 중이에요…</p> : null}
              <EndNotice cur={ttiCur} retry={ttiRetry} />
            </article>
            {tti.sections['나이별 운세'] && <AgeList text={tti.sections['나이별 운세']} mine={mineYY} />}
            {tti.sections['한 줄 조언'] && (
              <article className="day-text">
                <h2>한 줄 조언</h2>
                <Markdown text={tti.sections['한 줄 조언']} />
              </article>
            )}
          </section>
        </>
      )}
    </>
  );
}

// ── 띠 운세 조각 ──
// 행운의 색 이름 → 실제 색 (AI 에게 이 목록 안에서 고르게 함, topics.js TTI_FORMAT)
const LUCKY_COLORS = [
  [/빨|적색|붉/, '#e5484d'],
  [/주황|오렌지/, '#f08a3e'],
  [/노랑|노란|황색/, '#f2c94c'],
  [/초록|녹색|연두/, '#4caf6a'],
  [/하늘/, '#6ec6f0'],
  [/남색|네이비/, '#3949ab'],
  [/파랑|파란|청색/, '#3b82f6'],
  [/보라|자주/, '#9b6dd6'],
  [/분홍|핑크/, '#f28cb1'],
  [/흰|하양|백색|화이트/, '#f5f5f2'],
  [/검|흑색|블랙/, '#111214'],
  [/회색|그레이/, '#9aa0a6'],
  [/갈색|브라운/, '#9a6b45'],
  [/금색|황금|골드/, '#e2c27a'],
  [/은색|실버/, '#c0c6cc'],
  [/베이지/, '#e8d7b5'],
];
const colorOf = (name) => (LUCKY_COLORS.find(([re]) => re.test(name)) || [null, '#e2c27a'])[1];
// 방향 → 나침반 바늘 각도 (북 = 0°, 시계 방향)
const DIRS = [
  [/^(북동|동북)/, 45],
  [/^(동남|남동)/, 135],
  [/^(남서|서남)/, 225],
  [/^(북서|서북)/, 315],
  [/^북/, 0],
  [/^동/, 90],
  [/^남/, 180],
  [/^서/, 270],
];
const angleOf = (name) => {
  const d = DIRS.find(([re]) => re.test(String(name).trim()));
  return d ? d[1] : null;
};

export function LuckyPoints({ lucky }) {
  const color = String(lucky['색'] || '').trim();
  const num = String(lucky['숫자'] || '').trim();
  const dir = String(lucky['방향'] || '').trim();
  const ang = angleOf(dir);
  return (
    <section className="lucky" aria-label="행운 포인트">
      <h2 className="day-sub">행운 포인트</h2>
      <ul className="lucky-list">
        {color && (
          <li>
            <span className="lucky-swatch" style={{ '--c': colorOf(color) }} aria-hidden="true" />
            <span className="lucky-k">행운의 색</span>
            <b>{color}</b>
          </li>
        )}
        {num && (
          <li>
            <span className="lucky-coin" aria-hidden="true">
              <span>{num}</span>
            </span>
            <span className="lucky-k">행운의 숫자</span>
            <b>{num}</b>
          </li>
        )}
        {dir && (
          <li>
            <svg className="lucky-compass" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="29" fill="#26272b" stroke="rgba(226,194,122,0.55)" strokeWidth="1.5" />
              <circle cx="32" cy="32" r="22" fill="none" stroke="rgba(194,196,200,0.18)" strokeDasharray="2 3" />
              <text x="32" y="12.5" textAnchor="middle" fontSize="8" fill="#e8e9ec">북</text>
              <text x="54" y="35" textAnchor="middle" fontSize="8" fill="#a9abb0">동</text>
              <text x="32" y="58" textAnchor="middle" fontSize="8" fill="#a9abb0">남</text>
              <text x="10" y="35" textAnchor="middle" fontSize="8" fill="#a9abb0">서</text>
              {ang != null && (
                <g transform={`rotate(${ang} 32 32)`}>
                  <path d="M32 15 L36 32 L32 30 L28 32z" fill="var(--primary)" />
                  <path d="M32 49 L36 32 L32 34 L28 32z" fill="rgba(194,196,200,0.35)" />
                </g>
              )}
              <circle cx="32" cy="32" r="2.6" fill="#1b1c1e" stroke="var(--primary)" strokeWidth="1.2" />
            </svg>
            <span className="lucky-k">행운의 방향</span>
            <b>{dir}</b>
          </li>
        )}
      </ul>
    </section>
  );
}

// 나이별 운세: "- 08년생: …" 줄들을 연도 배지 + 글로. 내 출생 연도 줄은 강조
function AgeList({ text, mine }) {
  const rows = text
    .split('\n')
    .map((l) => /^\s*[-*•]?\s*\**\s*(\d{2})\s*년생\s*\**\s*[:：]?\s*(.+)$/.exec(l))
    .filter(Boolean)
    .map((m) => ({ yy: m[1], body: m[2].replace(/\*\*/g, '').trim() }));
  return (
    <article className="day-text ages">
      <h2>나이별 운세</h2>
      {rows.length === 0 ? (
        <Markdown text={text} />
      ) : (
        <ol className="age-list">
          {rows.map((r) => (
            <li key={r.yy} className={mine === r.yy ? 'is-mine' : ''}>
              <span className="age-yy">
                {r.yy}
                <small>년생</small>
              </span>
              <p>
                {mine === r.yy && <span className="age-me">나</span>}
                {r.body}
              </p>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
