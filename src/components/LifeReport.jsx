// 평생 사주 리포트: 맨 위 요약 → 1~6 항목 → 7 인생의 흐름(대운 그래프 타임라인).
// 풀이는 네 부분(REPORT_PARTS)을 동시에 받아 '## ' 제목 단위로 각 섹션에 나눠 넣는다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ELEMENTS, ELEMENT_KO, ELEMENT_HANJA } from '../lib/saju.js';
import { REPORT_PARTS } from '../lib/topics.js';
import { streamReading } from '../lib/stream.js';
import { loadReport, saveReportPart, peekFresh, clearFresh } from '../lib/storage.js';
import { trackEvent } from '../lib/analytics.js';
import { GOD_SHORT } from '../lib/glossary.js';
import { dosaFaceSvg } from '../brand/dosaArt.js';
import Markdown from './Markdown.jsx';
import ChartTable from './ChartTable.jsx';
import ElementChart from './ElementChart.jsx';
import { Help, TermButton } from './Glossary.jsx';

// 섹션 자리: [부분 id, 그 부분 안에서 몇 번째 '## ' 덩어리인지]
const SLOTS = {
  summary: ['life1', 0],
  s1: ['life1', 1],
  s2: ['life2', 0],
  s3: ['life2', 1],
  s4: ['life3', 0],
  s5: ['life3', 1],
  s6: ['life4', 0],
  s7: ['life4', 1],
};
const SECTIONS = [
  ['s1', '타고난 사주와 기본 성향', '命'],
  ['s2', '재물운', '財'],
  ['s3', '직업운', '業'],
  ['s4', '연애운과 결혼운', '緣'],
  ['s5', '건강운', '康'],
  ['s6', '가족운과 대인관계', '家'],
  ['s7', '인생의 전반적인 흐름', '運'],
];
const DM_IMAGE = {
  甲: '곧게 자라는 큰 나무', 乙: '덩굴과 풀꽃', 丙: '하늘의 태양', 丁: '밤을 밝히는 등불', 戊: '넓은 산과 대지',
  己: '곡식을 기르는 밭', 庚: '단단한 바위와 쇠', 辛: '다듬어진 보석', 壬: '큰 강과 바다', 癸: '비와 이슬',
};
const PLAIN = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };

// 부분 글을 '## ' 덩어리로 나누고, 끝의 ```json 그래프 데이터는 따로 뺀다 (받는 중이면 ``` 뒤는 숨김)
function splitPart(text) {
  let body = text;
  let data = null;
  const fence = body.indexOf('```');
  if (fence >= 0) {
    const m = body.slice(fence).match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) {
      try {
        data = JSON.parse(m[1]);
      } catch {
        data = null;
      }
    }
    body = body.slice(0, fence);
  }
  const chunks = body
    .split(/\n(?=##\s)/)
    .map((c) => c.trim())
    .filter((c) => c.startsWith('##'))
    .map((c) => c.replace(/^##[^\n]*\n?/, '').trim()); // 섹션 제목은 화면이 따로 그림
  return { chunks, data };
}

// ── 로딩: 눈 감고 사주를 보다가 번쩍 뜨며 "나왔다!" ──
const LOADER_STEPS = [
  { at: 0, face: { eyes: 'closed', mouth: 'none' }, line: '흠… 네 여덟 글자를 펼쳐 보자꾸나' },
  { at: 900, face: { eyes: 'sleep', mouth: 'o' }, line: '하늘의 기운이 모여드는구나…' },
  { at: 1800, face: { eyes: 'star', mouth: 'open', brows: 'raise' }, line: '보인다… 나왔다!' },
];
const LOADER_ART = LOADER_STEPS.map((s) => dosaFaceSvg(s.face, 'life'));
function DosaLoader({ onDone }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [step, setStep] = useState(0);
  const [out, setOut] = useState(false);
  useEffect(() => {
    const k = reduce ? 0.4 : 1;
    const timers = [
      setTimeout(() => setStep(1), 900 * k),
      setTimeout(() => setStep(2), 1800 * k),
      setTimeout(() => setOut(true), 2500 * k),
      setTimeout(onDone, 2800 * k),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone, reduce]);
  return (
    <div className={`dosa-loader${out ? ' is-out' : ''}`} role="status" aria-live="polite">
      <div className={`dosa-loader-art step-${step}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: LOADER_ART[step] }} />
      <p key={step} className="dosa-loader-line">
        {LOADER_STEPS[step].line}
      </p>
      <span className="dosa-loader-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

// ── 7. 인생 흐름 그래프 (대운별 흐름 점수) ──
function LifeTimeline({ chart, data }) {
  // 그래프 폭 = 실제 화면 폭 (글씨가 줄어들지 않게). 좁으면 키워드는 그래프 아래 목록으로
  const boxRef = useRef(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([en]) => setW(Math.max(280, Math.round(en.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = W < 520;
  const daeun = chart.daeun;
  const nowAge = chart.seun.year - Number(chart.solarDate.slice(0, 4));
  const HGT = narrow ? 210 : 230;
  const padX = narrow ? 18 : 34;
  const top = 34;
  const bottom = 176;
  const xs = daeun.map((_, i) => padX + (i * (W - padX * 2)) / Math.max(1, daeun.length - 1));
  const scores = daeun.map((d) => {
    const hit = data?.daeun?.find((x) => Number(x.age) === d.startAge);
    return hit ? Math.max(5, Math.min(95, Number(hit.score) || 50)) : null;
  });
  const ready = scores.every((s) => s !== null);
  const ys = scores.map((s) => (s === null ? (top + bottom) / 2 : bottom - ((s - 5) / 90) * (bottom - top)));
  // 부드러운 곡선 (Catmull-Rom → 베지어)
  let path = `M${xs[0]} ${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[i - 1] ?? xs[i];
    const y0 = ys[i - 1] ?? ys[i];
    const x3 = xs[i + 2] ?? xs[i + 1];
    const y3 = ys[i + 2] ?? ys[i + 1];
    path += ` C${xs[i] + (xs[i + 1] - x0) / 6} ${ys[i] + (ys[i + 1] - y0) / 6} ${xs[i + 1] - (x3 - xs[i]) / 6} ${ys[i + 1] - (y3 - ys[i]) / 6} ${xs[i + 1]} ${ys[i + 1]}`;
  }
  const area = `${path} L${xs[xs.length - 1]} ${bottom} L${xs[0]} ${bottom} Z`;
  const nowIdx = daeun.findIndex((d) => d.ganzhi === chart.currentDaeun?.ganzhi);
  const turning = (data?.turning || []).map(Number).filter((a) => Number.isFinite(a));
  const ageToX = (age) => {
    const ages = daeun.map((d) => d.startAge);
    if (age <= ages[0]) return xs[0];
    for (let i = 0; i < ages.length - 1; i++) {
      if (age <= ages[i + 1]) return xs[i] + ((age - ages[i]) / (ages[i + 1] - ages[i])) * (xs[i + 1] - xs[i]);
    }
    return xs[xs.length - 1];
  };
  // 초년(~19)·중년(20~59)·말년(60~) 구간 띠
  const bands = [
    ['초년', 0, 20],
    ['중년', 20, 60],
    ['말년', 60, 200],
  ].map(([label, a, b]) => ({ label, x1: ageToX(a), x2: ageToX(b) }));

  return (
    <figure className={`timeline${ready ? ' is-ready' : ''}${narrow ? ' is-narrow' : ''}`} ref={boxRef}>
      <svg width={W} height={HGT} viewBox={`0 0 ${W} ${HGT}`} role="img" aria-label={ready ? `대운별 흐름: ${daeun.map((d, i) => `${d.startAge}세 ${scores[i]}점`).join(', ')}` : '대운 흐름 그래프를 그리는 중'}>
        <defs>
          <linearGradient id="tl-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2c27a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#e2c27a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {bands.map((b, i) => (
          <g key={b.label}>
            <rect x={b.x1} y={top - 22} width={Math.max(0, b.x2 - b.x1)} height={bottom - top + 22} fill={i % 2 ? 'rgba(255,255,255,0.025)' : 'transparent'} />
            {b.x2 - b.x1 > 30 && (
              <text x={(b.x1 + b.x2) / 2} y={top - 10} textAnchor="middle" className="tl-band">
                {b.label}
              </text>
            )}
          </g>
        ))}
        <line x1={padX} x2={W - padX} y1={bottom} y2={bottom} className="tl-axis" />
        {turning.map((age) => (
          <g key={`t${age}`}>
            <line x1={ageToX(age)} x2={ageToX(age)} y1={top - 4} y2={bottom} className="tl-turn" />
            {!narrow && (
              <text x={ageToX(age)} y={bottom + 44} textAnchor="middle" className="tl-turn-label">
                전환점 {age}세
              </text>
            )}
          </g>
        ))}
        {ready && <path d={area} fill="url(#tl-fill)" />}
        <path d={path} className={`tl-line${ready ? '' : ' is-wait'}`} />
        {daeun.map((d, i) => (
          <g key={d.startYear}>
            <circle cx={xs[i]} cy={ys[i]} r={i === nowIdx ? 7 : 4.5} className={`tl-dot${i === nowIdx ? ' is-now' : ''}`} />
            {ready && (!narrow || i === nowIdx) && (
              <text x={xs[i]} y={ys[i] - 14} textAnchor="middle" className="tl-kw">
                {data.daeun.find((x) => Number(x.age) === d.startAge)?.keyword}
              </text>
            )}
            <text x={xs[i]} y={bottom + 18} textAnchor="middle" className={`tl-age${i === nowIdx ? ' is-now' : ''}`}>
              {d.startAge}세
            </text>
            {!narrow && (
              <text x={xs[i]} y={bottom + 31} textAnchor="middle" className="tl-gz">
                {d.ko}
              </text>
            )}
          </g>
        ))}
      </svg>
      {narrow && ready && (
        <ol className="tl-list">
          {daeun.map((d, i) => {
            const hit = data.daeun.find((x) => Number(x.age) === d.startAge);
            return (
              <li key={d.startYear} className={i === nowIdx ? 'is-now' : ''}>
                <span className="tl-list-age">{d.startAge}세</span>
                <b>{hit?.keyword}</b>
                {turning.includes(d.startAge) && <span className="tl-list-turn">전환점</span>}
              </li>
            );
          })}
        </ol>
      )}
      <figcaption>
        {ready ? (
          <>
            금색 점이 지금({nowAge}세 무렵) 지나고 있는 대운이에요. 점수는 원국과 대운의 조화로 본 <b>상대적인 흐름</b>이에요.
          </>
        ) : (
          '천둥도사가 대운의 흐름을 그리는 중이에요…'
        )}
      </figcaption>
    </figure>
  );
}

function Skeleton() {
  return (
    <div className="skel" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function LifeReport({ chart, input }) {
  // 로딩은 방금 입력을 마치고 들어왔을 때만 (새로고침이면 안 나옴)
  const [loading, setLoading] = useState(peekFresh);
  useEffect(() => clearFresh(), []);
  // 이미 받은 풀이(새로고침 전)는 그대로 보여 주고 다시 부르지 않음
  const [parts, setParts] = useState(() =>
    Object.fromEntries(Object.entries(loadReport(input)).map(([id, text]) => [id, { text, status: 'done', error: null }]))
  ); // id → { text, status, error }
  const abortRef = useRef(null);

  const run = (ids) => {
    const ctrl = abortRef.current || new AbortController();
    abortRef.current = ctrl;
    ids.forEach(async (id) => {
      const update = (patch) => setParts((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
      update({ text: '', status: 'loading', error: null });
      try {
        const r = await streamReading({ input, topic: id, signal: ctrl.signal, onText: (text) => update({ text }) });
        update({ text: r.text, status: r.error ? 'error' : 'done', error: r.error });
        if (!r.error && r.text) saveReportPart(input, id, r.text);
        trackEvent(r.error ? 'reading_fail' : 'reading_done', { topic: id, end: r.end || 'ok' });
      } catch (e) {
        if (e.name !== 'AbortError') update({ status: 'error', error: '네트워크 연결을 확인하고 다시 시도해 주세요.' });
      }
    });
  };

  // 화면에 들어오면 네 부분을 한꺼번에 요청 (StrictMode 이중 실행 대비 setTimeout)
  useEffect(() => {
    const t = setTimeout(() => {
      const saved = loadReport(input);
      const todo = REPORT_PARTS.map((p) => p.id).filter((id) => !saved[id]);
      if (!todo.length) return;
      trackEvent('reading_start', { topic: 'life' });
      run(todo);
    }, 0);
    return () => {
      clearTimeout(t);
      abortRef.current?.abort();
      abortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const split = useMemo(() => Object.fromEntries(REPORT_PARTS.map((p) => [p.id, splitPart(parts[p.id]?.text || '')])), [parts]);
  const slot = (key) => {
    const [pid, idx] = SLOTS[key];
    const st = parts[pid] || { status: 'loading' };
    const text = split[pid].chunks[idx] || '';
    return { text, status: st.status, error: st.error, pid };
  };
  const retry = (pid) => run([pid]);

  // 요약 카드용 계산값
  const dm = chart.dayMaster;
  const sorted = [...ELEMENTS].sort((a, b) => chart.elements[b] - chart.elements[a]);
  const strong = sorted.filter((e) => chart.elements[e] === chart.elements[sorted[0]] && chart.elements[e] > 0);
  const missing = ELEMENTS.filter((e) => chart.elements[e] === 0);
  const pillars = ['year', 'month', 'day', 'hour'].map((k) => chart.pillars[k]).filter(Boolean);
  const yang = pillars.reduce((n, p) => n + (p.stemYang ? 1 : 0) + (p.branchYang ? 1 : 0), 0);
  const total = pillars.length * 2;
  const topGods = Object.entries(chart.gods)
    .filter(([g]) => GOD_SHORT[g])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([g]) => g);

  const summary = slot('summary');

  const body = (key) => {
    const s = slot(key);
    if (s.text) return (
      <div className="report-text">
        <Markdown text={s.text} />
        {s.status === 'loading' && <span className="cursor" aria-hidden="true" />}
      </div>
    );
    if (s.status === 'error') return (
      <div className="notice">
        <p>{s.error}</p>
        <button type="button" className="btn-ghost" onClick={() => retry(s.pid)}>다시 시도</button>
      </div>
    );
    return <Skeleton />;
  };

  return (
    <>
      {loading && <DosaLoader onDone={() => setLoading(false)} />}

      {/* 맨 위: 내 사주 요약 */}
      <section className="report-summary card">
        <p className="eyebrow">평생 사주 · 한눈에 보기</p>
        <div className="report-dm">
          <span className={`dm el-${dm.element}`}>{dm.stem}</span>
          <div>
            <h1 className="report-dm-title">
              {dm.ko}{ELEMENT_KO[dm.element]} 일간 <Help term="일간" />
            </h1>
            <p className="report-dm-sub">{DM_IMAGE[dm.stem]}의 기운을 타고났어요</p>
          </div>
        </div>
        <ul className="report-facts">
          <li>
            <span>강한 기운</span>
            <b>{strong.map((e) => `${PLAIN[e]}(${ELEMENT_HANJA[e]})`).join('·') || '-'}</b>
          </li>
          <li>
            <span>부족한 기운</span>
            <b>{missing.length ? missing.map((e) => `${PLAIN[e]}(${ELEMENT_HANJA[e]})`).join('·') : '고루 있어요'}</b>
          </li>
          <li>
            <span>음양</span>
            <b>
              양 {yang} · 음 {total - yang}
            </b>
          </li>
          <li>
            <span>내 사주에 많은 성향</span>
            <b className="report-gods">
              {topGods.map((g) => (
                <TermButton key={g} term={g} className="god" />
              ))}
            </b>
          </li>
          <li>
            <span>지금 대운</span>
            <b>{chart.currentDaeun ? `${chart.currentDaeun.ko} (${chart.currentDaeun.startYear}~)` : '대운 시작 전'}</b>
          </li>
        </ul>
        <div className="report-summary-text">
          {summary.text ? <Markdown text={summary.text} /> : summary.status === 'error' ? <p className="hint">{summary.error}</p> : <Skeleton />}
        </div>
      </section>

      <nav className="report-toc" aria-label="평생 사주 목차">
        {SECTIONS.map(([key, title], i) => (
          <a key={key} href={`#${key}`} onClick={(e) => { e.preventDefault(); document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
            {i + 1}. {title}
          </a>
        ))}
      </nav>

      {SECTIONS.map(([key, title, glyph], i) => (
        <section key={key} id={key} className="report-sec card">
          <h2 className="report-sec-title">
            <span className="report-sec-glyph" aria-hidden="true">{glyph}</span>
            <span>
              <small>{i + 1}</small>
              {title}
            </span>
          </h2>
          {key === 's1' && (
            <div className="report-chart">
              <ChartTable chart={chart} />
              <h3 className="report-sub">
                오행의 균형 <Help term="오행" />
              </h3>
              <ElementChart elements={chart.elements} />
            </div>
          )}
          {key === 's7' && <LifeTimeline chart={chart} data={split.life4.data} />}
          {body(key)}
        </section>
      ))}

      <p className="ai-note report-note">천둥도사의 풀이는 계산된 원국을 바탕으로 생성형 AI가 쓴 참고용 해석이에요.</p>
    </>
  );
}
