// 별마루 (/byeolmaru, 2026-11-15 기획 1단계 1번) — 밤하늘 아래 마당을 내 천동이로 걸어 다니는 곳.
// 화면 전체를 3D 세상으로 쓰고(머리 메뉴·푸터 숨김), 위에 나가기·이름, 아래 동작 버튼 4개(다음 단계에서 연결), 휴대폰은 왼쪽 조이스틱.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { trackEvent } from '../lib/analytics.js';
import { saveTopic } from '../lib/storage.js';
import { skyState } from '../lib/byeolmaruSky.js';
import { copyText, sendKakao } from '../lib/share.js';
import { computeSaju } from '../lib/saju.js';
import { startAmbient, stopAmbient, startPad, stopPad, bowBell, starTing, stopAll } from '../lib/bmSound.js';

const Byeolmaru3D = lazy(() => import('../components/Byeolmaru3D.jsx'));

// 기운 받기 뒤 '오늘의 한마디' — 풀이 비용 없이 고정 문장, 날짜(KST)마다 하나
const WORDS_OF_DAY = [
  '서두르지 않아도 괜찮아요. 오늘은 한 걸음이면 충분해요.',
  '마음에 걸린 일 하나만 내려놓아도 하루가 가벼워져요.',
  '지금 곁에 있는 사람에게 고맙다고 말해 보세요.',
  '잘하고 싶은 마음이 크다는 건, 이미 잘하고 있다는 뜻이에요.',
  '오늘의 피곤함은 내일의 단단함이 될 거예요.',
  '작은 약속 하나를 지키는 날로 만들어 보세요.',
  '비교는 잠시 멈추고, 어제의 나만 바라봐요.',
  '쉬어 가는 것도 앞으로 가는 방법이에요.',
  '좋은 일은 생각보다 조용히 다가와요.',
  '오늘 들은 칭찬 하나를 오래 기억해 두세요.',
  '마음이 흔들릴 땐, 숨을 세 번만 천천히 쉬어 보세요.',
  '정리된 책상 하나가 생각보다 큰 힘이 돼요.',
  '미뤄 둔 연락 하나가 반가운 소식을 데려올 거예요.',
  '나에게 다정한 말을 건네는 하루가 되길 바라요.',
  '물처럼 부드럽게, 바위처럼 단단하게 가 보세요.',
  '지금 고민은 언젠가 웃으며 꺼낼 이야기가 될 거예요.',
  '오늘은 맛있는 걸 먹고 일찍 자는 것도 좋은 선택이에요.',
  '하고 싶은 말은 부드럽게, 하기 싫은 말은 짧게 해 보세요.',
  '별은 어두울수록 더 잘 보여요. 지금도 그래요.',
  '나를 웃게 하는 작은 것 하나를 찾아보세요.',
  '천천히 가도 멈추지만 않으면 도착해요.',
];
const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const wordOfDay = () => {
  const d = kstToday();
  let h = 0;
  for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return WORDS_OF_DAY[h % WORDS_OF_DAY.length];
};
// 오늘 헤아린 별 (이 브라우저, 날짜가 바뀌면 0)
const STAR_KEY = 'saju:bm-stars';
const STAR_GOAL = 108;
const loadStars = () => {
  try {
    const v = JSON.parse(localStorage.getItem(STAR_KEY) || 'null');
    return v && v.d === kstToday() ? v.n : 0;
  } catch {
    return 0;
  }
};
const saveStars = (n) => {
  try {
    localStorage.setItem(STAR_KEY, JSON.stringify({ d: kstToday(), n }));
  } catch {
    /* 무시 */
  }
};
const QI_OPTIONS = [
  { s: 30, label: '30초' },
  { s: 180, label: '3분' },
  { s: 300, label: '5분' },
  { s: 600, label: '10분' },
];
const PREF_KEY = 'saju:bm-prefs';
const loadPrefs = () => {
  try {
    return { sound: false, pad: false, qi: 30, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') };
  } catch {
    return { sound: false, pad: false, qi: 30 };
  }
};
const savePrefs = (p) => {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {
    /* 무시 */
  }
};
const fmtLeft = (sec) => (sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : `${sec}초`);

// 사진 카드: 지금 장면 + 아래 띠(별마루 낙관 · 이름 · 날짜 · 별 수 · 주소)
async function composePhoto(shot, { nick, stars, ymd, special }) {
  const img = new Image();
  img.src = shot;
  await img.decode();
  const W = Math.min(1080, img.width);
  const H = Math.round((img.height / img.width) * W);
  const band = Math.round(W * 0.2);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H + band;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, W, H);
  g.fillStyle = '#0d1028';
  g.fillRect(0, H, W, band);
  const u = W / 1080;
  // 붉은 낙관 天文
  g.fillStyle = '#c8352b';
  g.fillRect(40 * u, H + 40 * u, 92 * u, 112 * u);
  g.fillStyle = '#fce9c8';
  g.textAlign = 'center';
  g.font = `600 ${44 * u}px "ChosunSm", serif`;
  g.fillText('天', 86 * u, H + 92 * u);
  g.fillText('文', 86 * u, H + 140 * u);
  g.textAlign = 'left';
  g.fillStyle = '#F3E4BF';
  g.font = `600 ${56 * u}px "ChosunSm", serif`;
  g.fillText('별마루', 160 * u, H + 98 * u);
  g.fillStyle = 'rgba(236,238,244,0.85)';
  g.font = `500 ${32 * u}px "Pretendard Variable", Pretendard, sans-serif`;
  g.fillText(`${nick} · ${ymd.replace(/-/g, '.')}${special ? ` · ${special}` : ''}`, 160 * u, H + 148 * u);
  g.textAlign = 'right';
  g.fillStyle = '#EBCB86';
  g.font = `600 ${40 * u}px "Pretendard Variable", Pretendard, sans-serif`;
  if (stars > 0) g.fillText(`★ ${stars}`, W - 40 * u, H + 98 * u);
  g.fillStyle = 'rgba(236,238,244,0.6)';
  g.font = `500 ${28 * u}px "Pretendard Variable", Pretendard, sans-serif`;
  g.fillText('사주천문.com/byeolmaru', W - 40 * u, H + 148 * u);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/jpeg', 0.92));
}

// 숨 고르기 화면: 4초 들숨 · 4초 날숨, 30초
function Breath({ seconds = 30, onDone, onStop }) {
  const QI_SECONDS = seconds;
  const [left, setLeft] = useState(QI_SECONDS);
  useEffect(() => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const l = QI_SECONDS - Math.floor((Date.now() - t0) / 1000);
      setLeft(Math.max(0, l));
      if (l <= 0) {
        clearInterval(iv);
        onDone();
      }
    }, 250);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const phase = Math.floor((QI_SECONDS - left) / 4) % 2 === 0 ? '숨을 천천히 들이쉬어요' : '천천히 내쉬어요';
  return (
    <div className="bm-breath" role="status" aria-live="polite">
      <span className="bm-breath-ring" aria-hidden="true" />
      <p className="bm-breath-say">{phase}</p>
      <p className="bm-breath-left">{fmtLeft(left)}</p>
      <button type="button" className="bm-breath-stop" onClick={onStop}>
        그만하기
      </button>
    </div>
  );
}

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
  const apiRef = useRef(null);
  const [stars, setStars] = useState(loadStars);
  const [qi, setQi] = useState(null); // null | 'walk' | 'on'
  const [card, setCard] = useState(null); // { kind: 'word' | 'lantern' | 'stars' }
  const [sky] = useState(skyState);
  const [banner, setBanner] = useState(() => (sky.special ? sky.special : null));
  const [photo, setPhoto] = useState(null); // { url, blob }
  const [prefs, setPrefs] = useState(loadPrefs);
  const [settings, setSettings] = useState(false);
  const [sleep, setSleep] = useState(false);
  const setPref = (k, v) =>
    setPrefs((p) => {
      const n = { ...p, [k]: v };
      savePrefs(n);
      return n;
    });
  // 내 띠 수호신: 마이페이지에 내 사주 정보를 등록한 회원
  const guardian = (() => {
    try {
      return auth?.user?.birth ? computeSaju(auth.user.birth).animal : null;
    } catch {
      return null;
    }
  })();
  // 소리: 켜 두면 들어올 때·누를 때 이어짐 (브라우저 규칙상 첫 누름 뒤에만 실제로 남)
  useEffect(() => {
    if (prefs.sound) startAmbient();
    else stopAmbient();
  }, [prefs.sound]);
  useEffect(() => {
    if (prefs.pad) startPad();
    else stopPad();
  }, [prefs.pad]);
  useEffect(() => () => stopAll(), []);
  // 브라우저는 누른 뒤에만 소리를 허락함 → 첫 누름·키 입력 때 켜 둔 소리를 다시 깨움
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  useEffect(() => {
    const wake = () => {
      if (prefsRef.current.sound) startAmbient();
      if (prefsRef.current.pad) startPad();
    };
    window.addEventListener('pointerdown', wake, { once: true });
    window.addEventListener('keydown', wake, { once: true });
    return () => {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);
  useEffect(() => {
    apiRef.current?.setPaused?.(sleep);
  }, [sleep]);
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

  const onEvent = (type) => {
    if (type === 'qi-walk') setQi('walk');
    else if (type === 'qi-start') setQi('on');
    else if (type === 'qi-cancel') setQi(null);
    else if (type === 'lantern-up') setCard({ kind: 'lantern' });
  };
  const act = (a) => {
    trackEvent('plaza_action', { type: a.id });
    const api = apiRef.current;
    if (!api) return;
    setCard(null);
    if (a.id === 'qi') {
      if (qi) return;
      api.qi();
    } else if (a.id === 'bow') {
      api.bow();
      if (prefs.sound) setTimeout(bowBell, 450);
    }
    else if (a.id === 'star') {
      if (stars >= STAR_GOAL) return notify?.('오늘의 별 108개를 모두 헤아렸어요. 내일 또 와요.');
      api.star();
      if (prefs.sound) starTing();
      const n = stars + 1;
      setStars(n);
      saveStars(n);
      if (n === STAR_GOAL) {
        trackEvent('plaza_star_done');
        setCard({ kind: 'stars' });
      }
    } else if (a.id === 'lantern') api.lantern();
  };
  // 사진 찍기 → 카드 만들기
  const takePhoto = async () => {
    const shot = apiRef.current?.snapshot?.();
    if (!shot) return;
    trackEvent('plaza_photo');
    const blob = await composePhoto(shot, { nick, stars, ymd: sky.now.ymd, special: sky.special?.title });
    if (!blob) return;
    setPhoto((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return { url: URL.createObjectURL(blob), blob };
    });
  };
  const sharePhoto = async () => {
    const file = new File([photo.blob], 'byeolmaru.jpg', { type: 'image/jpeg' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '별마루', text: '별마루에서 별을 보고 있어요' });
        trackEvent('plaza_share', { method: 'file' });
        return;
      }
    } catch {
      return;
    }
    await copyText('https://사주천문.com/byeolmaru');
    notify?.('별마루 주소를 복사했어요. 사진은 저장해서 올려 주세요.');
    trackEvent('plaza_share', { method: 'link' });
  };
  const kakaoPhoto = () => {
    trackEvent('plaza_share', { method: 'kakao' });
    sendKakao({ title: '별마루에서 별을 보고 있어요', description: '밤하늘 아래 천동이 곁에 잠깐 앉아 쉬어 가요. 같이 들어와요.', path: '/byeolmaru', button: '별마루 들어가기' });
  };

  const qiDone = () => {
    apiRef.current?.stopQi();
    setQi(null);
    trackEvent('plaza_qi_done');
    setCard({ kind: 'word', text: wordOfDay(), ilji: sky.ilji });
  };
  const qiStop = () => {
    apiRef.current?.stopQi();
    setQi(null);
  };

  return (
    <div className="bm">
      {!failed ? (
        <Suspense fallback={null}>
          <Byeolmaru3D nick={nick} joyRef={joyRef} apiRef={apiRef} onEvent={onEvent} starCount={stars} sky={sky} guardian={guardian} onReady={() => setReady(true)} onFail={() => setFailed(true)} />
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
        {stars > 0 && (
          <span className="bm-stars" aria-label={`오늘 헤아린 별 ${stars}개`}>
            ★ {stars} <small>/ {STAR_GOAL}</small>
          </span>
        )}
        <button type="button" className="bm-icon-btn" onClick={() => setSettings(true)} aria-label="소리·숨 고르기 설정">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
        </button>
        <button type="button" className="bm-icon-btn" onClick={takePhoto} aria-label="사진 찍기" disabled={!ready}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </button>
      </div>

      {ready && banner && (
        <button type="button" className="bm-banner" onClick={() => setBanner(null)}>
          <b>오늘은 {banner.title}</b> {banner.line}
        </button>
      )}

      {settings && (
        <div className="contact-overlay bm-photo-overlay" onMouseDown={(e) => e.target === e.currentTarget && setSettings(false)}>
          <div className="bm-settings" role="dialog" aria-modal="true" aria-labelledby="bm-set-title">
            <h2 id="bm-set-title" className="bm-set-title">별마루 설정</h2>
            <label className="bm-set-row">
              <span>
                <b>마당 소리</b>
                <small>바람·풀벌레·풍경 소리</small>
              </span>
              <span className="toggle">
                <input type="checkbox" role="switch" checked={prefs.sound} onChange={(e) => setPref('sound', e.target.checked)} />
                <span className="toggle-track" aria-hidden="true">
                  <span className="toggle-knob" />
                </span>
              </span>
            </label>
            <label className="bm-set-row">
              <span>
                <b>명상 소리</b>
                <small>숨 고르기와 같은 박자로 낮게 깔리는 소리</small>
              </span>
              <span className="toggle">
                <input type="checkbox" role="switch" checked={prefs.pad} onChange={(e) => setPref('pad', e.target.checked)} />
                <span className="toggle-track" aria-hidden="true">
                  <span className="toggle-knob" />
                </span>
              </span>
            </label>
            <div className="bm-set-row is-col">
              <b>숨 고르기 길이</b>
              <div className="saved-seg">
                {QI_OPTIONS.map((o) => (
                  <button key={o.s} type="button" className={prefs.qi === o.s ? 'on' : ''} onClick={() => setPref('qi', o.s)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="bm-set-sleep"
              onClick={() => {
                setSettings(false);
                setSleep(true);
                trackEvent('plaza_sleep');
              }}
            >
              자기 전 모드 켜기
              <small>화면을 어둡게 하고 소리만 남겨요</small>
            </button>
            <button type="button" className="bm-photo-close" onClick={() => setSettings(false)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {sleep && (
        <button type="button" className="bm-sleep" onClick={() => setSleep(false)} aria-label="자기 전 모드 끄기">
          <span className="bm-sleep-moon" aria-hidden="true" />
          <span className="bm-sleep-text">편안한 밤 되세요</span>
          <span className="bm-sleep-hint">화면을 누르면 마당으로 돌아와요</span>
        </button>
      )}

      {photo && (
        <div className="contact-overlay bm-photo-overlay" onMouseDown={(e) => e.target === e.currentTarget && setPhoto(null)}>
          <div className="bm-photo" role="dialog" aria-modal="true" aria-label="별마루 사진">
            <img src={photo.url} alt="별마루에서 찍은 사진" />
            <div className="bm-photo-actions">
              <a className="bm-card-ghost" href={photo.url} download={`byeolmaru-${sky.now.ymd}.jpg`} onClick={() => trackEvent('plaza_photo_save')}>
                저장하기
              </a>
              <button type="button" className="bm-card-ghost" onClick={kakaoPhoto}>
                카카오톡
              </button>
              <button type="button" className="bm-card-main" onClick={sharePhoto}>
                공유하기
              </button>
            </div>
            <button type="button" className="bm-photo-close" onClick={() => setPhoto(null)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {qi === 'walk' && <p className="bm-help">방석으로 가는 중이에요… 걸으면 멈춰요</p>}
      {qi === 'on' && <Breath seconds={prefs.qi} onDone={qiDone} onStop={qiStop} />}

      {card && (
        <div className="bm-card" role="dialog" aria-labelledby="bm-card-title">
          {card.kind === 'word' && (
            <>
              <p className="bm-card-kicker">오늘의 한마디 · {card.ilji?.ko}일 {card.ilji?.element}의 기운</p>
              <p id="bm-card-title" className="bm-card-text">
                {card.text}
              </p>
              {card.ilji && <p className="bm-card-sub">{card.ilji.line}</p>}
              <div className="bm-card-actions">
                <button type="button" className="bm-card-ghost" onClick={() => setCard(null)}>
                  닫기
                </button>
                <button type="button" className="bm-card-main" onClick={() => { saveTopic('today'); navigate('/start'); }}>
                  오늘의 운세도 보기
                </button>
              </div>
            </>
          )}
          {card.kind === 'lantern' && (
            <>
              <p className="bm-card-kicker">등불이 하늘로 올라가요</p>
              <p id="bm-card-title" className="bm-card-text">
                이 등불에 소원을 담아 볼까요?
              </p>
              <div className="bm-card-actions">
                <button type="button" className="bm-card-ghost" onClick={() => setCard(null)}>
                  나중에
                </button>
                <button type="button" className="bm-card-main" onClick={() => navigate('/wish?write=1')}>
                  소원 쓰기
                </button>
              </div>
            </>
          )}
          {card.kind === 'stars' && (
            <>
              <p className="bm-card-kicker">오늘의 별</p>
              <p id="bm-card-title" className="bm-card-text">
                108개의 별을 모두 헤아렸어요. 내일도 별을 헤아리러 와요.
              </p>
              <div className="bm-card-actions">
                <button type="button" className="bm-card-main" onClick={() => setCard(null)}>
                  좋아요
                </button>
              </div>
            </>
          )}
        </div>
      )}

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
          <button key={a.id} type="button" onClick={() => act(a)} className={a.id === 'qi' && qi ? 'on' : ''} aria-pressed={a.id === 'qi' ? !!qi : undefined}>
            <ActionIcon id={a.id} />
            <span>{a.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
