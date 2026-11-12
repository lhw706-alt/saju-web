import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogoSymbol } from '../components/Logo.jsx';
import ContentCards from '../components/ContentCards.jsx';
import { loadInput, saveTopic } from '../lib/storage.js';
import { TOPICS, NEXT_YEAR } from '../lib/topics.js';
import { trackEvent } from '../lib/analytics.js';

// 3D 천동이는 따로 불러옴 (three.js 가 커서 첫 화면을 막지 않게). 불러오는 동안·3D 불가 시 2D 그림.
const Mascot3D = lazy(() => import('../components/Mascot3D.jsx'));
const MascotStill = () => <LogoSymbol size={170} className="mascot-still" />;

// 첫 화면에서 무슨 사이트인지 바로 보이게: 지금 볼 수 있는 풀이를 번갈아 보여 줌 (흐려졌다 바뀜)
const WORDS = ['평생 사주', `${NEXT_YEAR} 신년운세`, '오행과 대운', '연애·재물운', '직업·적성'];
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Rotator() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const id = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="rotator" aria-hidden="true">
      {WORDS.map((w, n) => (
        <span key={w} className={`rotator-word${n === i ? ' is-on' : ''}`}>
          {w}
        </span>
      ))}
    </span>
  );
}

// 물음에 답하는 바로가기: 풀이 주제 그대로 (결과 화면에서 바로 시작)
const ASK_CHIPS = ['overall', 'newyear', 'love', 'money', 'career'].map((id) => TOPICS.find((t) => t.id === id)).filter(Boolean);

export default function Home() {
  const navigate = useNavigate();
  const { hash } = useLocation();

  // 상단 메뉴(#사주 등)로 들어오면 해당 카드 묶음으로 이동
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [hash]);

  // 쓸 수 있는 카드: 입력해 둔 생년월일이 있으면 바로 결과 화면에서 그 풀이 시작, 없으면 입력 화면(/start)으로
  const openContent = (c) => {
    trackEvent('content_click', { content: c.id });
    if (c.topic) saveTopic(c.topic);
    navigate(loadInput() ? '/result' : '/start');
  };

  return (
    <>
      <section className="hero">
        <div className="hero-mascot">
          <Suspense fallback={<MascotStill />}>
            <Mascot3D />
          </Suspense>
        </div>
        <h1>
          <span className="visually-hidden">{WORDS.join(', ')}까지 </span>
          <Rotator />
          <br />
          생년월일로 바로 풀어 드려요
        </h1>
        <p className="lead">
          생년월일시를 넣으면 여덟 글자(사주 원국)와 오행·대운을 바로 계산하고,
          <br className="pc" /> 영험한 천둥도사가 원국의 어느 글자에서 그렇게 읽었는지 근거와 함께 풀어 드려요.
        </p>
        {/* 도사의 물음에 답하듯 고르는 바로가기 (지금 볼 수 있는 풀이만) */}
        <ul className="ask-chips" aria-label="궁금한 것 고르기">
          {ASK_CHIPS.map((t) => (
            <li key={t.id}>
              <button type="button" className="ask-chip" onClick={() => openContent({ id: `chip_${t.id}`, title: t.label, topic: t.id })}>
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <ContentCards onOpen={openContent} />

    </>
  );
}
