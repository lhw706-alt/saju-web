// 타로 (/tarot, 2026-11-14 사용자 요청) — 3D 천동이 앞 탁자 위 카드 → 무엇이 궁금한지·몇 장 볼지 고르기 → 섞기 → 엎어 둔 22장 중 직접 고르기
// → 한 장씩 뒤집기 → 천둥도사의 풀이(스트리밍, /api/tarot). 카드 그림은 src/lib/tarot.js 창작 디자인. 질문은 저장하지 않음.
// 디자인: 반짝임·유리·이모지 없이 종이 카드와 얇은 선, 글자 계층(사용자 지시 'AI 티 없이').
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TAROT, TAROT_TOPICS, TAROT_SPREADS, TAROT_Q_MAX, tarotById, tarotFaceSvg, TAROT_BACK } from '../lib/tarot.js';
import { wishProblem } from '../lib/wish.js';
import { streamTarot, END_MESSAGES } from '../lib/stream.js';
import { dosaArtSvg } from '../brand/dosaArt.js';
import Markdown from '../components/Markdown.jsx';
import ResultShare from '../components/ShareRow.jsx';
import { trackEvent } from '../lib/analytics.js';

const Mascot3D = lazy(() => import('../components/Mascot3D.jsx'));
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const Face = ({ c, rev }) => <span className={`tarot-face${rev ? ' is-rev' : ''}`} dangerouslySetInnerHTML={{ __html: tarotFaceSvg(c) }} />;
const Back = () => <span className="tarot-back" dangerouslySetInnerHTML={{ __html: TAROT_BACK }} />;

// 풀이 글을 '## ' 단락으로
const sectionsOf = (text) => {
  const parts = text.split(/^##\s+(.+)$/m);
  const out = [];
  for (let i = 1; i < parts.length; i += 2) out.push({ title: parts[i].trim(), text: (parts[i + 1] || '').trim() });
  return out;
};

export default function Tarot() {
  const { notify } = useOutletContext();
  const [left, setLeft] = useState(null); // 오늘 남은 횟수 (서버 /api/tarot GET)
  const loadLeft = () =>
    fetch('/api/tarot', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setLeft(d.left))
      .catch(() => {});
  useEffect(() => {
    loadLeft();
  }, []);
  const [phase, setPhase] = useState('setup'); // setup | shuffle | pick | reveal
  const [topic, setTopic] = useState('today');
  const [count, setCount] = useState(1);
  const [question, setQuestion] = useState('');
  const [qErr, setQErr] = useState('');
  const [deck, setDeck] = useState([]); // 섞은 카드 { id, rev }
  const [chosen, setChosen] = useState([]); // deck 의 자리
  const [shown, setShown] = useState(0); // 뒤집힌 장수
  const [reading, setReading] = useState({ text: '', status: 'idle', error: '', end: null });
  const ctrl = useRef(null);
  const top = useRef(null);
  useEffect(() => () => ctrl.current?.abort(), []);

  const spread = TAROT_SPREADS[count];
  const picks = useMemo(() => chosen.map((k) => ({ ...deck[k], card: tarotById(deck[k].id) })), [chosen, deck]);

  const start = () => {
    const q = question.trim();
    if (q && wishProblem(q) && q.length >= 2) return setQErr(wishProblem(q));
    if (left === 0) {
      trackEvent('tarot_limit');
      notify('타로는 하루에 2번까지 볼 수 있어요. 내일 다시 카드를 펼쳐 주세요.');
      return;
    }
    trackEvent('tarot_start', { topic, count });
    setDeck(shuffle(TAROT.map((c) => ({ id: c.id, rev: Math.random() < 0.3 })))); // 30% 는 역방향
    setChosen([]);
    setShown(0);
    setReading({ text: '', status: 'idle', error: '', end: null });
    setPhase('shuffle');
    top.current?.scrollIntoView({ block: 'start' });
    setTimeout(() => setPhase('pick'), 2200);
  };

  const pick = (k) => {
    if (chosen.includes(k) || chosen.length >= count) return;
    const next = [...chosen, k];
    setChosen(next);
    if (next.length === count) setTimeout(() => reveal(next), 500);
  };

  const reveal = async (ks) => {
    setPhase('reveal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    ks.forEach((_, i) => setTimeout(() => setShown(i + 1), 500 + i * 650));
    const cards = ks.map((k) => ({ id: deck[k].id, rev: deck[k].rev }));
    trackEvent('tarot_reveal', { topic, count });
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setReading({ text: '', status: 'loading', error: '', end: null });
    try {
      const r = await streamTarot({ cards, spread: count, topic, question: question.trim(), signal: ctrl.current.signal, onText: (text) => setReading((x) => ({ ...x, text })) });
      setReading({ text: r.text, status: r.error ? 'error' : 'done', error: r.error || '', end: r.end });
      loadLeft();
    } catch (e) {
      if (e.name !== 'AbortError') setReading((x) => ({ ...x, status: 'error', error: '네트워크 연결을 확인하고 다시 시도해 주세요.' }));
    }
  };

  const again = () => {
    ctrl.current?.abort();
    setPhase('setup');
    setChosen([]);
    setShown(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sections = sectionsOf(reading.text);
  const allShown = shown >= picks.length;

  return (
    <article className="tarot" ref={top}>
      {(phase === 'setup' || phase === 'shuffle') && (
        <div className="tarot-stage">
          <Suspense fallback={<span className="nm-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: dosaArtSvg('tarot') }} />}>
            <Mascot3D prop="tarot" mode={phase === 'shuffle' ? 'drawing' : 'idle'} />
          </Suspense>
        </div>
      )}

      {phase === 'setup' && (
        <section className="tarot-setup">
          <p className="tarot-kicker">타로</p>
          <h1 className="tarot-title">천둥도사가 카드를 읽어 드려요</h1>
          <p className="tarot-lead">마음을 가라앉히고, 궁금한 것을 떠올린 다음 카드를 골라 보세요.</p>

          <ol className="tarot-steps">
            <li>
              <span className="tarot-step-k">01</span>
              <div>
                <h2>무엇이 궁금한가요?</h2>
                <div className="tarot-opts" role="radiogroup" aria-label="궁금한 분야">
                  {TAROT_TOPICS.map((t) => (
                    <button key={t.id} type="button" role="radio" aria-checked={topic === t.id} className={topic === t.id ? 'on' : ''} onClick={() => setTopic(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </li>
            <li>
              <span className="tarot-step-k">02</span>
              <div>
                <h2>몇 장을 볼까요?</h2>
                <div className="tarot-count" role="radiogroup" aria-label="카드 장수">
                  {[1, 3].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={count === n} className={count === n ? 'on' : ''} onClick={() => setCount(n)}>
                      <span className={`tarot-count-ic n${n}`} aria-hidden="true">
                        {Array.from({ length: n }, (_, i) => (
                          <i key={i} />
                        ))}
                      </span>
                      <span className="tarot-count-txt">
                        <b>{TAROT_SPREADS[n].label}</b>
                        <span>{TAROT_SPREADS[n].desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </li>
            <li>
              <span className="tarot-step-k">03</span>
              <div>
                <h2>
                  질문 <small>선택</small>
                </h2>
                <input
                  className="tarot-q"
                  value={question}
                  maxLength={TAROT_Q_MAX}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    setQErr('');
                  }}
                  placeholder="예: 이번 달 이직을 준비해도 될까요?"
                  aria-label="질문"
                />
                {qErr && <p className="nm-err">{qErr}</p>}
              </div>
            </li>
          </ol>
          <button type="button" className="btn-primary tarot-go" onClick={start} disabled={left === 0}>
            카드 섞기
          </button>
          <p className="tarot-left">{left === 0 ? '오늘은 두 번 모두 보셨어요. 내일 다시 카드를 펼쳐 주세요.' : '타로는 하루에 2번까지 볼 수 있어요.'}</p>
        </section>
      )}

      {phase === 'shuffle' && <p className="tarot-status">천둥도사가 카드를 섞고 있어요…</p>}

      {phase === 'pick' && (
        <section className="tarot-pick">
          <p className="tarot-kicker">{TAROT_TOPICS.find((t) => t.id === topic)?.label}</p>
          <h1 className="tarot-title">마음이 가는 카드를 {count}장 골라 주세요</h1>
          <p className="tarot-lead">
            {chosen.length} / {count}
          </p>
          <ul className="tarot-spread">
            {deck.map((d, k) => (
              <li key={d.id} style={{ '--i': k }}>
                <button type="button" className={`tarot-pickcard${chosen.includes(k) ? ' is-picked' : ''}`} onClick={() => pick(k)} aria-label={`${k + 1}번째 카드 고르기`} disabled={chosen.includes(k)}>
                  <Back />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {phase === 'reveal' && (
        <section className="tarot-reveal" aria-live="polite">
          <p className="tarot-kicker">{TAROT_TOPICS.find((t) => t.id === topic)?.label}</p>
          <h1 className="tarot-title">{question.trim() ? `“${question.trim()}”` : '천둥도사가 카드를 읽고 있어요'}</h1>
          <ul className={`tarot-table n${count}`}>
            {picks.map((p, i) => (
              <li key={p.id}>
                <span className="tarot-pos">{spread.pos[i]}</span>
                <div className={`tarot-flip${i < shown ? ' is-open' : ''}`}>
                  <Back />
                  <Face c={p.card} rev={p.rev} />
                </div>
                <span className={`tarot-name${i < shown ? ' is-open' : ''}`}>
                  {p.card.ko} <small>{p.rev ? '역방향' : '정방향'}</small>
                </span>
              </li>
            ))}
          </ul>

          {allShown && (
            <div className="tarot-reading">
              {sections.length === 0 && reading.status === 'loading' && <p className="tarot-status">천둥도사가 카드를 들여다보고 있어요…</p>}
              {sections.map((s) => (
                <section key={s.title} className={`tarot-sec${s.title.includes('한마디') ? ' is-word' : ''}`}>
                  <h2>{s.title}</h2>
                  <Markdown text={s.text} />
                </section>
              ))}
              {(reading.status === 'error' || (reading.status === 'done' && reading.end && reading.end !== 'refusal')) && (
                <div className="notice">
                  <p>{reading.status === 'error' ? reading.error : END_MESSAGES[reading.end] || END_MESSAGES.error}</p>
                </div>
              )}
              {reading.status !== 'loading' && (
                <div className="tarot-after">
                  {/* 다시 뽑기: 타로 카드 톤(보라 바탕·금 테두리·카드 아이콘) — 2026-11-14 사용자 지시로 금색 덩어리 버튼 대신 */}
                  <button type="button" className="tarot-again" onClick={again}>
                    <span className="tarot-count-ic n3" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    카드 다시 섞기
                  </button>
                  <p className="tarot-note">타로는 지금의 마음을 비춰 보는 재미 콘텐츠예요. 중요한 결정은 스스로 판단해 주세요.</p>
                </div>
              )}
            </div>
          )}
          {allShown && reading.status === 'done' && (
            <ResultShare title="타로 결과를 나눠 보세요" path="/tarot" kakao={{ title: '천둥도사가 읽어 준 나의 타로', description: '카드를 골라 천둥도사의 타로 풀이를 받아 보세요.', button: '타로 보기' }} />
          )}
        </section>
      )}
    </article>
  );
}
