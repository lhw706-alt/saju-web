// 이름 궁합 (/name-match, 2026-11-14 사용자 기획안) — 이름 두 개 + 관계로 보는 '이름 소리 오행' 궁합.
// 흐름: 소개 → 입력(나·상대 이름, 관계) → 분석 연출(실제 계산하는 소리 오행을 글자마다 보여 줌) → 결과(점수·영역별·관계 유형·근거) → 상세 리포트 → 사주 궁합·다른 사람·공유.
// 풀이는 두 부분을 동시에 요청(name1 점수·유형 / name2 상세, src/lib/nameTopics.js). 이름은 서버에 저장하지 않고,
// 같은 이름·관계로 다시 보면 이 브라우저에 남긴 풀이를 그대로 보여 줌(localStorage saju:name-readings, 최근 12건).
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { streamNameMatch, END_MESSAGES } from '../lib/stream.js';
import { RELATIONS, relationById, nameOk, cleanName, nameSound, elRelation, nameKey, EL_KO, EL_HAN } from '../lib/nameSound.js';
import { guestCanView, markGuestView } from '../lib/history.js';
import { saveTopic } from '../lib/storage.js';
import { trackEvent } from '../lib/analytics.js';
import { dosaArtSvg } from '../brand/dosaArt.js';
import Markdown from '../components/Markdown.jsx';
import ResultShare from '../components/ShareRow.jsx';
import LiquidMetalButton from '../components/LiquidMetalButton.jsx';

// 3D 천동이 + 둘레를 도는 이름 패(名)·하트 (행운의 번호와 같은 품질, 2026-11-14 사용자 지시). 불러오는 동안·WebGL 이 없으면 2D 그림
const Mascot3D = lazy(() => import('../components/Mascot3D.jsx'));
const Stage = ({ mode = 'idle', small = false }) => (
  <div className={`nm-stage${small ? ' is-small' : ''}`}>
    <Suspense fallback={<span className="nm-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: dosaArtSvg('namematch') }} />}>
      <Mascot3D prop="names" mode={mode} />
    </Suspense>
  </div>
);

const MEMO = 'saju:name-readings';
const loadMemo = () => {
  try {
    return JSON.parse(localStorage.getItem(MEMO) || '{}') || {};
  } catch {
    return {};
  }
};
const saveMemo = (key, part, text) => {
  try {
    const all = loadMemo();
    all[key] = { ...(all[key] || {}), [part]: text, at: Date.now() };
    const keep = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, 12);
    localStorage.setItem(MEMO, JSON.stringify(Object.fromEntries(keep)));
  } catch {
    /* 무시 */
  }
};

// 맨 앞 json 과 '## ' 단락 나누기 (받는 중인 열린 코드블록은 숨기고, 점수만 먼저 꺼내 씀)
function parse(text) {
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
    const sc = /"score"\s*:\s*(\d+)/.exec(body.slice(open));
    if (!data && sc) data = { score: Number(sc[1]) };
    body = body.slice(0, open);
  }
  const sections = [];
  const parts = body.split(/^##\s+(.+)$/m);
  for (let i = 1; i < parts.length; i += 2) sections.push({ title: parts[i].trim(), text: (parts[i + 1] || '').trim() });
  return { data, sections };
}
const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const AREAS = [
  ['성격', '성격 궁합'],
  ['대화', '대화 궁합'],
  ['감정', '감정 궁합'],
  ['지속력', '관계 지속력'],
];
// 관계 아이콘: 이모지 대신 사이트 톤의 얇은 선 아이콘 (2026-11-14 사용자 지시)
const REL_PATHS = {
  lover: 'M9 19s-6-3.6-6-8.2A3.3 3.3 0 0 1 9 9a3.3 3.3 0 0 1 6 1.8M15 21s-5-3-5-6.8A2.7 2.7 0 0 1 15 12.6a2.7 2.7 0 0 1 5 1.6C20 18 15 21 15 21z',
  some: 'M12 20s-7-4.2-7-9.4A3.8 3.8 0 0 1 12 8.5a3.8 3.8 0 0 1 7 2.1C19 15.8 12 20 12 20zM19 3v3M17.5 4.5h3',
  friend: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 20c.6-3 2.8-5 5.5-5s4.9 2 5.5 5M12.5 16.2c.9-.8 2.1-1.2 3.5-1.2 2.7 0 4.9 2 5.5 5',
  spouse: 'M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM9.5 9.6 8 6l2-3h4l2 3-1.5 3.6M8 6h8',
  coworker: 'M4 8h16v11H4zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16',
  etc: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
};
const RelIcon = ({ id, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={REL_PATHS[id] || REL_PATHS.etc} />
  </svg>
);

// 소개 화면 특징 3가지 (✦ 목록 대신 아이콘 카드, 2026-11-14 사용자 지시)
const FEATS = [
  { title: '이름 두 개면 끝', desc: '생년월일 없이 바로 시작해요', path: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4' },
  { title: '4가지 궁합 점수', desc: '성격·대화·감정·지속력', path: 'M5 20V12M10 20V6M15 20v-9M20 20V4' },
  { title: '숨은 관계 해석', desc: '누가 먼저 다가갈지까지', path: 'M12 20s-7-4.2-7-9.4A3.8 3.8 0 0 1 12 8.5a3.8 3.8 0 0 1 7 2.1C19 15.8 12 20 12 20z' },
];

const STEPS = ['두 사람의 이름을 살펴보고 있어요', '글자마다 첫소리로 소리 오행을 찾고 있어요', '두 이름의 오행이 어떻게 어울리는지 보고 있어요', '궁합 결과가 나왔어요!'];

function SoundRow({ name, sound, lit = 99 }) {
  return (
    <div className="nm-sound">
      <span className="nm-sound-name">{name}</span>
      <span className="nm-sound-chars">
        {sound.chars.map((c, i) => (
          <span key={i} className={`nm-char el-${c.el}${i < lit ? ' is-lit' : ''}`}>
            <b>{c.ch}</b>
            <small>
              {c.cho} · {EL_KO[c.el]}
              {EL_HAN[c.el]}
            </small>
          </span>
        ))}
      </span>
    </div>
  );
}

export default function NameMatch() {
  const navigate = useNavigate();
  const { auth, openLogin } = useOutletContext();
  const [phase, setPhase] = useState('intro'); // intro | form | analyzing | result
  const [me, setMe] = useState('');
  const [partner, setPartner] = useState('');
  const [relation, setRelation] = useState('');
  const [sent, setSent] = useState(null); // 분석한 { me, partner, relation }
  const [parts, setParts] = useState({}); // name1 | name2 → { text, status, end, error }
  const [step, setStep] = useState(0);
  const [minDone, setMinDone] = useState(false);
  const ctrlRef = useRef(null);
  const topRef = useRef(null);

  useEffect(() => () => ctrlRef.current?.abort(), []);
  const ok = nameOk(me) && nameOk(partner) && !!relation;

  const run = async (ids, info) => {
    const key = nameKey(info.me, info.partner, info.relation);
    const ctrl = ctrlRef.current || new AbortController();
    ctrlRef.current = ctrl;
    await Promise.all(
      ids.map(async (id) => {
        const update = (patch) => setParts((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
        update({ text: '', status: 'loading', end: null, error: null });
        try {
          const r = await streamNameMatch({ ...info, part: id, signal: ctrl.signal, onText: (text) => update({ text }) });
          update({ text: r.text, status: r.error ? 'error' : 'done', end: r.end, error: r.error });
          if (!r.error && r.text && !r.end) saveMemo(key, id, r.text);
        } catch (e) {
          if (e.name !== 'AbortError') update({ status: 'error', error: '네트워크 연결을 확인하고 다시 시도해 주세요.' });
        }
      })
    );
  };

  const start = () => {
    if (!ok) return;
    const info = { me: cleanName(me), partner: cleanName(partner), relation };
    const key = nameKey(info.me, info.partner, info.relation);
    if (!auth.user) {
      if (!guestCanView(key)) {
        trackEvent('guest_limit', { from: 'name_match' });
        openLogin('천둥도사가 기운을 아끼는 중이에요. 로그인하면 이름 궁합을 계속 볼 수 있어요.');
        return;
      }
      markGuestView(key);
    }
    trackEvent('name_match_start', { relation });
    setSent(info);
    setStep(0);
    setMinDone(false);
    setPhase('analyzing');
    topRef.current?.scrollIntoView({ block: 'start' });
    ctrlRef.current?.abort();
    ctrlRef.current = new AbortController();
    const memo = loadMemo()[key];
    const done = Object.fromEntries(['name1', 'name2'].filter((id) => memo?.[id]).map((id) => [id, { text: memo[id], status: 'done', end: null, error: null }]));
    setParts(done);
    const todo = ['name1', 'name2'].filter((id) => !done[id]);
    if (todo.length) run(todo, info);
  };

  // 분석 연출: 단계마다 0.9초, 최소 4단계를 보여 주고 점수가 나오면 결과로
  const p1 = parts.name1 || { text: '', status: 'loading' };
  const p2 = parts.name2 || { text: '', status: 'loading' };
  const r1 = useMemo(() => parse(p1.text || ''), [p1.text]);
  const r2 = useMemo(() => parse(p2.text || ''), [p2.text]);
  const score = r1.data && Number.isFinite(Number(r1.data.score)) ? clamp(r1.data.score) : null;
  useEffect(() => {
    if (phase !== 'analyzing') return undefined;
    const t = [setTimeout(() => setStep(1), 900), setTimeout(() => setStep(2), 1800), setTimeout(() => setMinDone(true), 2700)];
    return () => t.forEach(clearTimeout);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'analyzing' || !minDone) return undefined;
    if (score == null && p1.status === 'loading') return undefined;
    setStep(3);
    const t = setTimeout(() => {
      setPhase('result');
      trackEvent('name_match_done', { relation: sent?.relation });
    }, 800);
    return () => clearTimeout(t);
  }, [phase, minDone, score, p1.status, sent]);

  const rel = relationById(sent?.relation || relation);
  const soundA = useMemo(() => (sent ? nameSound(sent.me) : null), [sent]);
  const soundB = useMemo(() => (sent ? nameSound(sent.partner) : null), [sent]);
  const flow = soundA && soundB ? elRelation(soundA.main, soundB.main) : null;

  const again = () => {
    ctrlRef.current?.abort();
    ctrlRef.current = null;
    setPartner('');
    setRelation('');
    setParts({});
    setSent(null);
    setPhase('form');
    window.scrollTo(0, 0);
  };
  const toSaju = () => {
    trackEvent('content_click', { content: 'match', from: 'name_match' });
    saveTopic('match');
    navigate('/start');
  };
  const retry = (id) => {
    setParts((p) => ({ ...p, [id]: undefined }));
    ctrlRef.current = new AbortController();
    run([id], sent);
  };
  const EndNote = ({ part, id }) =>
    part.status === 'error' || (part.status === 'done' && part.end && part.end !== 'refusal') ? (
      <div className="notice">
        <p>{part.status === 'error' ? part.error : END_MESSAGES[part.end] || END_MESSAGES.error}</p>
        <button type="button" className="btn-ghost" onClick={() => retry(id)}>
          이 부분 다시 받기
        </button>
      </div>
    ) : null;

  return (
    <article className="nm" ref={topRef}>
      {phase === 'intro' && (
        <section className="nm-intro">
          <p className="nm-kicker">이름 궁합</p>
          <h1 className="nm-title">
            이름만으로 알아보는
            <br />두 사람의 궁합
          </h1>
          <p className="nm-lead">우리는 얼마나 잘 맞을까? 이름 속 소리에 숨겨진 두 사람의 케미를 천둥도사가 풀어 드려요.</p>
          <Stage />
          <LiquidMetalButton
            label="우리의 궁합 확인하기"
            width={232}
            onClick={() => {
              trackEvent('name_match_open');
              setPhase('form');
            }}
          />
          <ul className="nm-feats">
            {FEATS.map((f) => (
              <li key={f.title}>
                <span className="nm-feat-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={f.path} />
                  </svg>
                </span>
                <span className="nm-feat-text">
                  <b>{f.title}</b>
                  <span>{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {phase === 'form' && (
        <form
          className="nm-form"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <h1 className="start-title">우리의 이름 궁합</h1>
          <p className="start-lead">두 사람의 이름을 한글로 적어 주세요.</p>
          <label className="nm-label" htmlFor="nm-me">
            나의 이름
          </label>
          <span className="input">
            <input id="nm-me" value={me} onChange={(e) => setMe(e.target.value)} placeholder="예: 김하늘" maxLength={10} autoComplete="off" aria-invalid={!!me && !nameOk(me)} />
          </span>
          {me && !nameOk(me) && <p className="nm-err">한글 2~5글자로 적어 주세요.</p>}
          <label className="nm-label" htmlFor="nm-partner">
            상대방 이름
          </label>
          <span className="input">
            <input id="nm-partner" value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="예: 이도윤" maxLength={10} autoComplete="off" aria-invalid={!!partner && !nameOk(partner)} />
          </span>
          {partner && !nameOk(partner) && <p className="nm-err">한글 2~5글자로 적어 주세요.</p>}
          <p className="nm-label" id="nm-rel-label">
            두 사람의 관계는 무엇인가요?
          </p>
          <div className="nm-rels" role="radiogroup" aria-labelledby="nm-rel-label">
            {RELATIONS.map((r) => (
              <button key={r.id} type="button" role="radio" aria-checked={relation === r.id} className={relation === r.id ? 'on' : ''} onClick={() => setRelation(r.id)}>
                <RelIcon id={r.id} />
                <span>{r.label}</span>
              </button>
            ))}
          </div>
          <div className="nm-submit">
            <LiquidMetalButton type="submit" label="궁합 분석하기" width={200} disabled={!ok} />
          </div>
          <p className="nm-privacy">이름은 궁합 풀이에만 쓰고 서버에 저장하지 않아요. 같은 이름으로 다시 볼 수 있게 이 브라우저에만 남아요.</p>
        </form>
      )}

      {phase === 'analyzing' && sent && (
        <section className="nm-analyze" aria-live="polite">
          <Stage mode={step >= 3 ? 'done' : 'drawing'} small />
          <p className="nm-step">{STEPS[step]}</p>
          <div className="nm-sound-box">
            <SoundRow name={sent.me} sound={soundA} lit={step >= 1 ? 99 : 0} />
            <SoundRow name={sent.partner} sound={soundB} lit={step >= 1 ? 99 : 0} />
          </div>
          {step >= 2 && flow && <p className="nm-flow">{flow.text}</p>}
          <span className="nm-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </section>
      )}

      {phase === 'result' && sent && (
        <>
          <section className="nm-head">
            <p className="nm-kicker">이름 궁합 분석 완료</p>
            <h1 className="nm-names">
              {sent.me}
              <span className="nm-names-link" aria-label="와">
                <RelIcon id={rel?.romantic ? 'some' : 'friend'} size={22} />
              </span>
              {sent.partner}
            </h1>
            <span className="nm-rel-chip">
              <RelIcon id={rel?.id} size={15} /> {rel?.label}
            </span>
            <div className="nm-score" aria-label={score != null ? `이름 궁합 ${score}점` : '점수를 계산하는 중'}>
              {score != null ? (
                <>
                  <b>{score}</b>
                  <small>점</small>
                </>
              ) : (
                <span className="moon-spin" aria-hidden="true" />
              )}
            </div>
            {r1.data?.title && <p className="nm-r-title">{r1.data.title}</p>}
            {r1.data?.subtitle && <p className="nm-r-sub">{r1.data.subtitle}</p>}
          </section>

          {r1.data?.areas && (
            <section className="nm-sec card">
              <h2>궁합 항목별 점수</h2>
              <ul className="nm-bars">
                {AREAS.map(([k, label]) => (
                  <li key={k}>
                    <span>{label}</span>
                    <span className="nm-bar" aria-hidden="true">
                      <i style={{ width: `${clamp(r1.data.areas[k])}%` }} />
                    </span>
                    <b>{clamp(r1.data.areas[k])}점</b>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r1.data?.type?.name && (
            <section className="nm-sec nm-type card">
              <p className="nm-type-k">두 사람의 관계 유형</p>
              <h2>{r1.data.type.name}</h2>
              <p>{r1.data.type.desc}</p>
            </section>
          )}

          <section className="nm-sec card">
            <h2>이름 소리로 본 근거</h2>
            <div className="nm-sound-box">
              <SoundRow name={sent.me} sound={soundA} />
              <SoundRow name={sent.partner} sound={soundB} />
            </div>
            {flow && <p className="nm-flow">{flow.text}</p>}
            <p className="nm-basis">글자마다 첫소리(초성)로 소리 오행을 정했어요 — 성명학에서 흔히 쓰는 기준(ㄱㅋ 목, ㄴㄷㄹㅌ 화, ㅇㅎ 토, ㅅㅈㅊ 금, ㅁㅂㅍ 수)이에요. 한자 뜻과 획수, 사주는 보지 않았어요.</p>
          </section>

          {r1.sections.map((s) => (
            <section key={s.title} className="nm-sec card">
              <h2>{s.title}</h2>
              <Markdown text={s.text} />
            </section>
          ))}
          {p1.status === 'loading' && !r1.sections.length && <p className="hint center">천둥도사가 풀이를 쓰고 있어요…</p>}
          <EndNote part={p1} id="name1" />

          <section className="nm-report">
            <p className="nm-kicker">두 사람의 숨겨진 궁합</p>
            <h2 className="nm-report-title">상세 리포트</h2>
            {r2.sections.map((s) => (
              <div key={s.title} className="nm-sec card">
                <h3>{s.title}</h3>
                <Markdown text={s.text} />
              </div>
            ))}
            {p2.status === 'loading' && !r2.sections.length && <p className="hint center">상세 리포트를 쓰고 있어요…</p>}
            <EndNote part={p2} id="name2" />
          </section>

          <section className="nm-next">
            <div className="nm-saju card">
              <b>태어난 정보로 더 깊이 보기</b>
              <p>이름 궁합은 이름 소리만 봐요. 두 사람의 생년월일시로 오행과 사주 구성의 조화를 보는 사주 궁합도 있어요.</p>
              <button type="button" className="btn-primary" onClick={toSaju}>
                사주로 정밀 궁합 보기
              </button>
            </div>
            <button type="button" className="btn-ghost nm-again" onClick={again}>
              다른 사람과 이름 궁합 보기
            </button>
            <p className="nm-note">이름 소리로 보는 재미 콘텐츠예요. 관계에 대한 결정은 두 사람의 마음으로 해 주세요.</p>
          </section>

          <ResultShare
            title="이름 궁합 결과를 나눠 보세요"
            path="/name-match"
            kakao={{ title: score != null ? `우리 이름 궁합 ${score}점!` : '천둥도사의 이름 궁합', description: '이름 두 개로 알아보는 우리 사이의 케미. 너도 해 볼래?', button: '이름 궁합 보기' }}
          />
        </>
      )}
    </article>
  );
}
