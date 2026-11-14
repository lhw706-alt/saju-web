// 별마루 (/byeolmaru, 2026-11-15 기획 1단계 1번) — 밤하늘 아래 마당을 내 천동이로 걸어 다니는 곳.
// 화면 전체를 3D 세상으로 쓰고(머리 메뉴·푸터 숨김), 위에 나가기·이름, 아래 동작 버튼 4개(다음 단계에서 연결), 휴대폰은 왼쪽 조이스틱.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { trackEvent } from '../lib/analytics.js';

const Byeolmaru3D = lazy(() => import('../components/Byeolmaru3D.jsx'));

const WORDS = ['고요한', '반짝이는', '포근한', '맑은', '느긋한', '다정한', '조용한', '따스한'];
const NOUNS = ['별', '바람', '등불', '구름', '달빛', '물결', '새벽', '이슬'];
// 비회원 이름: 이 탭에서 한 번 정해 그대로
function guestName() {
  try {
    const k = 'saju:bm-name';
    let n = sessionStorage.getItem(k);
    if (!n) {
      n = `${WORDS[Math.floor(Math.random() * WORDS.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`;
      sessionStorage.setItem(k, n);
    }
    return n;
  } catch {
    return '고요한 별';
  }
}

// 휴대폰 조이스틱: 누른 자리를 중심으로 끌면 그 방향으로 걷기 (joyRef 에 -1~1 값)
function Joystick({ joyRef }) {
  const [knob, setKnob] = useState(null); // { cx, cy, x, y }
  const id = useRef(null);
  const R = 46;
  const start = (e) => {
    id.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setKnob({ cx: e.clientX, cy: e.clientY, x: 0, y: 0 });
  };
  const move = (e) => {
    if (id.current !== e.pointerId || !knob) return;
    let dx = e.clientX - knob.cx;
    let dy = e.clientY - knob.cy;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob((k) => ({ ...k, x: dx, y: dy }));
    joyRef.current = { x: dx / R, y: -dy / R };
  };
  const end = (e) => {
    if (id.current !== e.pointerId) return;
    id.current = null;
    setKnob(null);
    joyRef.current = { x: 0, y: 0 };
  };
  return (
    <div className="bm-joy-zone" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} aria-hidden="true">
      {knob ? (
        <span className="bm-joy" style={{ left: knob.cx, top: knob.cy }}>
          <i style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
        </span>
      ) : (
        <span className="bm-joy-hint">여기를 끌어서 걸어요</span>
      )}
    </div>
  );
}

const ACTIONS = [
  { id: 'qi', label: '기운 받기' },
  { id: 'bow', label: '합장' },
  { id: 'star', label: '별 헤아리기' },
  { id: 'lantern', label: '등불 띄우기' },
];

function ActionIcon({ id }) {
  const p = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (id === 'qi')
    return (
      <svg {...p}>
        <circle cx="12" cy="9" r="3.2" />
        <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
        <path d="M12 2.5v1.5M7 4.5l1 1.2M17 4.5l-1 1.2" />
      </svg>
    );
  if (id === 'bow')
    return (
      <svg {...p}>
        <path d="M12 3c-1.5 2-2.5 5-2.5 8.5V20M12 3c1.5 2 2.5 5 2.5 8.5V20" />
        <path d="M8 21h8" />
      </svg>
    );
  if (id === 'star')
    return (
      <svg {...p}>
        <path d="M12 3l2.6 5.6 6 .7-4.5 4 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.5-4 6-.7z" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M8 6h8l1 9c0 2.5-2.2 4-5 4s-5-1.5-5-4z" />
      <path d="M10 3h4M12 3v3M10 22h4" />
    </svg>
  );
}

export default function Byeolmaru() {
  const navigate = useNavigate();
  const { auth, notify } = useOutletContext();
  const joyRef = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [help, setHelp] = useState(true);
  const nick = auth?.user?.nick || guestName();

  useEffect(() => {
    trackEvent('plaza_enter', { member: auth?.user ? 'yes' : 'no' });
    const t = setTimeout(() => setHelp(false), 7000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = (a) => {
    trackEvent('plaza_action', { type: a.id });
    notify?.(`'${a.label}'는 곧 열려요. 지금은 마당을 둘러보세요.`);
  };

  return (
    <div className="bm">
      {!failed ? (
        <Suspense fallback={null}>
          <Byeolmaru3D nick={nick} joyRef={joyRef} onReady={() => setReady(true)} onFail={() => setFailed(true)} />
        </Suspense>
      ) : (
        <div className="bm-fail">
          <p>이 기기에서는 별마루를 열 수 없어요.</p>
          <p>3D 화면(WebGL)을 지원하는 브라우저에서 다시 들어와 주세요.</p>
        </div>
      )}

      {!ready && !failed && (
        <div className="bm-loading" role="status">
          <span className="bm-loading-moon" aria-hidden="true" />
          <p>별마루로 들어가는 중이에요…</p>
        </div>
      )}

      {/* 위: 나가기 · 장소 이름 */}
      <div className="bm-top">
        <button type="button" className="bm-exit" onClick={() => navigate('/')} aria-label="별마루에서 나가기">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          나가기
        </button>
        <span className="bm-place">
          별마루 <small>天文</small>
        </span>
      </div>

      {ready && help && (
        <p className="bm-help" role="status">
          <span className="bm-help-desk">WASD·방향키로 걷고, 끌어서 둘러봐요</span>
          <span className="bm-help-mobile">왼쪽을 끌어서 걷고, 오른쪽을 끌어서 둘러봐요</span>
        </p>
      )}

      {ready && <Joystick joyRef={joyRef} />}

      {/* 아래: 동작 버튼 4개 */}
      <nav className="bm-actions" aria-label="별마루 동작">
        {ACTIONS.map((a) => (
          <button key={a.id} type="button" onClick={() => act(a)}>
            <ActionIcon id={a.id} />
            <span>{a.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
