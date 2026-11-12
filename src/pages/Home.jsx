import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogoSymbol } from '../components/Logo.jsx';
import BirthForm from '../components/BirthForm.jsx';
import ContentCards from '../components/ContentCards.jsx';
import { saveInput, loadInput, saveTopic, clearTopic } from '../lib/storage.js';
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
  const [picked, setPicked] = useState(null); // 카드에서 고른 풀이 (입력 전)
  const formRef = useRef(null);

  // 상단 메뉴(#사주 등)로 들어오면 해당 카드 묶음으로 이동
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [hash]);

  const onSubmit = (input) => {
    trackEvent('saju_submit', { time_known: input.timeKnown ? 'yes' : 'no' }); // 생년월일·성별은 보내지 않음
    saveInput(input);
    if (!picked) clearTopic();
    navigate('/result');
  };

  // 쓸 수 있는 카드: 입력해 둔 생년월일이 있으면 바로 결과 화면에서 그 풀이 시작, 없으면 입력칸으로
  const openContent = (c) => {
    trackEvent('content_click', { content: c.id });
    if (c.topic) saveTopic(c.topic);
    if (loadInput()) return navigate('/result');
    setPicked(c);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

      <div ref={formRef} className="form-anchor">
        {picked && (
          <p className="picked">
            <strong>{picked.title}</strong>을(를) 보려면 생년월일시를 넣어 주세요.
          </p>
        )}
        <BirthForm initial={loadInput() || undefined} onSubmit={onSubmit} />
      </div>

      <ContentCards onOpen={openContent} />

      <section className="features">
        <h2 className="section-title">이렇게 풀어 드려요</h2>
        <ul className="feature-list">
          <li>
            <strong>정확한 만세력</strong>
            <span>절기 시각으로 연주·월주를, 출생지 경도와 과거 서머타임까지 반영해 시주를 정해요.</span>
          </li>
          <li>
            <strong>오행과 십성</strong>
            <span>나무·불·흙·쇠·물 다섯 기운의 균형과 일간을 기준으로 한 관계를 한눈에 보여 줘요.</span>
          </li>
          <li>
            <strong>천둥도사의 주제별 풀이</strong>
            <span>{TOPICS.map((t) => t.label).join(' · ')} 가운데 궁금한 주제를 골라 보세요.</span>
          </li>
        </ul>
      </section>
    </>
  );
}
