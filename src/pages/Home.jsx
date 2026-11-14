import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogoSymbol } from '../components/Logo.jsx';
import ContentCards from '../components/ContentCards.jsx';
import { saveTopic } from '../lib/storage.js';
import { TOPICS, NEXT_YEAR } from '../lib/topics.js';
import { trackEvent } from '../lib/analytics.js';
import NewYearFab from '../components/NewYearFab.jsx';

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
const ASK_CHIPS = ['overall', 'newyear', 'love', 'money', 'career']
  .map((id) => TOPICS.find((t) => t.id === id))
  .filter(Boolean)
  .map((t) => (t.id === 'overall' ? { ...t, label: '평생 사주' } : t))
  // 2026-11-14 사용자 지시: 행운 뽑기·소원도 칩으로 (입력 없이 바로 그 화면)
  .concat([
    { id: 'number', label: '행운의 번호', path: '/lucky' },
    { id: 'wish', label: '소원 빌기', path: '/wish' },
  ]);

export default function Home() {
  const navigate = useNavigate();
  const { hash } = useLocation();

  // 상단 메뉴(#사주 등)로 들어오면 해당 카드 묶음으로 이동
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [hash]);

  // 쓸 수 있는 카드: 항상 입력 화면(/start)부터 → 다 입력한 뒤에 결과·로딩
  const openContent = (c) => {
    trackEvent('content_click', { content: c.id });
    if (c.path) return navigate(c.path); // 입력 없이 바로 쓰는 콘텐츠 (행운의 번호)
    if (c.topic) saveTopic(c.topic);
    navigate('/start');
  };

  return (
    <>
      <section className="hero">
        <h1>
          <span className="visually-hidden">{WORDS.join(', ')}까지 </span>
          <Rotator />
          <br />
          궁금한 건 천둥도사에게 물어봐요
        </h1>
        <p className="lead">
          생년월일시만 넣으면 사주 여덟 글자를 바로 계산하고,
          <br className="br-desk" /> 천둥도사가 근거와 함께 쉽게 풀어 드려요.
        </p>
        <div className="hero-mascot">
          <Suspense fallback={<MascotStill />}>
            <Mascot3D />
          </Suspense>
        </div>
        {/* 도사의 물음에 답하듯 고르는 바로가기 (지금 볼 수 있는 풀이만) */}
        <ul className="ask-chips" aria-label="궁금한 것 고르기">
          {ASK_CHIPS.map((t) => (
            <li key={t.id}>
              <button type="button" className="ask-chip" onClick={() => openContent(t.path ? { id: `chip_${t.id}`, title: t.label, path: t.path } : { id: `chip_${t.id}`, title: t.label, topic: t.id })}>
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 오늘의 질문(투표)은 2026-11-15 사용자 지시로 메인에서 잠시 숨김 — 나중에 다시 넣음 */}
      <ContentCards onOpen={openContent} />
      <NewYearFab />

    </>
  );
}
