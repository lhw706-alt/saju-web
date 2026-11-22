// 입력 전 소개(온보딩) — 2026-11-22 사용자 지시 (레퍼런스: 두루마리에 풀이 항목을 적어 보여 주는 화면)
// 한지 두루마리가 펼쳐지며 항목이 하나씩 적히고 → 예시 풀이가 한 글자씩 써지고 → [시작] 버튼.
// 내용은 src/lib/intros.js. 버튼을 누르면 Start.jsx 가 /start?go=1 로 넘어가 단계 입력을 보여 줌.
import { useEffect, useRef, useState } from 'react';
import { dosaArtSvg } from '../brand/dosaArt.js';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// 예시 풀이: 화면에 보이면 한 글자씩 써 내려감 (움직임 줄이기 설정이면 바로 전부)
function SampleText({ text }) {
  const ref = useRef(null);
  const [n, setN] = useState(() => (reduced() ? text.length : 0));
  const [go, setGo] = useState(false);
  useEffect(() => {
    if (n >= text.length) return;
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return setGo(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setGo(true), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!go || n >= text.length) return;
    const t = setTimeout(() => setN((x) => Math.min(text.length, x + 2)), 28);
    return () => clearTimeout(t);
  }, [go, n, text.length]);
  const done = n >= text.length;
  return (
    <p ref={ref} className={`intro-sample-text${done ? ' is-done' : ''}`}>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true">{text.slice(0, n)}</span>
      {!done && <i className="intro-caret" aria-hidden="true" />}
      <span className="intro-sample-ghost" aria-hidden="true">{text.slice(n)}</span>
    </p>
  );
}

export default function StartIntro({ intro, onStart }) {
  return (
    <div className="intro">
      <div className="intro-scroll">
        <span className="intro-dosa" aria-hidden="true" dangerouslySetInnerHTML={{ __html: dosaArtSvg(intro.art) }} />
        <span className="intro-rod" aria-hidden="true" />
        <div className="intro-paper">
          <p className="intro-kicker">{intro.kicker}</p>
          <h1 className="intro-title">{intro.title}</h1>
          <p className="intro-lead">{intro.lead}</p>
          <ol className="intro-list">
            {intro.items.map(([h, t], i) => (
              <li key={t} style={{ '--i': i }}>
                <span className="intro-seal" aria-hidden="true">{h}</span>
                {t}
              </li>
            ))}
          </ol>
          {intro.extra && <p className="intro-extra" style={{ '--i': intro.items.length }}>{intro.extra}</p>}
        </div>
        <span className="intro-rod" aria-hidden="true" />
      </div>

      <section className="intro-sample" aria-labelledby="intro-sample-h">
        <p className="intro-sample-who">{intro.sample.who}</p>
        <h2 id="intro-sample-h" className="intro-sample-h">{intro.sample.heading}</h2>
        <SampleText text={intro.sample.text} />
        <p className="intro-sample-foot">{intro.sample.foot || '내 여덟 글자로는 어떤 이야기가 나올까요?'}</p>
      </section>

      <div className="intro-go">
        <button type="button" className="intro-cta" onClick={onStart}>
          {intro.cta}
        </button>
        {intro.note && <p className="intro-note">{intro.note}</p>}
      </div>
    </div>
  );
}
