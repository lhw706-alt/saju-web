// 별마루 (/byeolmaru, 2026-11-15 기획 1단계 1번) — 밤하늘 아래 마당을 내 천동이로 걸어 다니는 곳.
// 화면 전체를 3D 세상으로 쓰고(머리 메뉴·푸터 숨김), 위에 나가기·이름, 아래 동작 버튼 4개(다음 단계에서 연결), 휴대폰은 왼쪽 조이스틱.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { trackEvent } from '../lib/analytics.js';
import { saveTopic } from '../lib/storage.js';
import { skyState } from '../lib/byeolmaruSky.js';
import { copyText, sendKakao } from '../lib/share.js';
import { COSMETICS, fmtCredits } from '../lib/wallet.js';
import { PriceTag, announceBalance } from '../components/BokchaLink.jsx';
import { WISH_MAX, wishProblem } from '../lib/wish.js';
import { askConfirm } from '../components/ConfirmHost.jsx';
import { computeSaju } from '../lib/saju.js';
import { MANSIONS, GROUPS as M_GROUPS, loadMansions, unlockToday, todayOracle, drawOracle } from '../lib/byeolmaruCollect.js';
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
// 이 탭의 무작위 아이디 (지금 인원 셈용 — 회원 정보와 상관없음)
const tabSid = () => {
  try {
    let v = sessionStorage.getItem('saju:bm-sid');
    if (!v) {
      v = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 6);
      sessionStorage.setItem('saju:bm-sid', v);
    }
    return v;
  } catch {
    return Math.random().toString(36).slice(2, 14);
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
  const { auth, notify, openLogin } = useOutletContext();
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
  const [mansions, setMansions] = useState(loadMansions);
  const [book, setBook] = useState(false);
  const [nearHut, setNearHut] = useState(false);
  const [hut, setHut] = useState(null); // null | { oracle, shaking }
  const [people, setPeople] = useState(null); // 지금 별마루에 있는 사람 수
  const [dress, setDress] = useState(false);
  const [wardrobe, setWardrobe] = useState(null); // { owned, equipped, balance }
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
  // 30초마다 "아직 있어요" + 인원·잔상 받기 (실시간 서버 없이 가볍게)
  // 탭을 내렸거나 자기 전 모드면 보내지 않음, 돌아오면 바로 한 번. 서버가 바쁘면 인원·잔상만 조용히 숨김.
  const sleepRef = useRef(false);
  sleepRef.current = sleep;
  useEffect(() => {
    if (!ready) return undefined;
    const sid = tabSid();
    let stop = false;
    const beat = async () => {
      if (document.hidden || sleepRef.current) return;
      const pos = apiRef.current?.getPos?.();
      if (pos) fetch('/api/plaza', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sid, ...pos }) }).catch(() => {});
      const r = await fetch('/api/plaza').then((x) => (x.ok ? x.json() : null)).catch(() => null); // CDN 이 10초 나눠 줌
      if (stop) return;
      if (!r || r.count == null) {
        setPeople(null);
        apiRef.current?.setGhosts?.([]);
        return;
      }
      setPeople(r.count);
      // 내 자리에 겹친 잔상(나 자신)은 빼고
      const me = apiRef.current?.getPos?.();
      apiRef.current?.setGhosts?.((r.ghosts || []).filter((g) => !me || Math.hypot(g.x - me.x, g.z - me.z) > 1.2));
    };
    beat();
    const iv = setInterval(beat, 30000);
    const onVis = () => !document.hidden && beat();
    document.addEventListener('visibilitychange', onVis);
    // 하늘의 소원 등불: 공개 소원 최근 것
    fetch('/api/wish?sort=new', { cache: 'no-store' })
      .then((x) => (x.ok ? x.json() : null))
      .then((d) => !stop && d && apiRef.current?.setWishes?.(d.wishes || []))
      .catch(() => {});
    return () => {
      stop = true;
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ready]);
  // 꾸미기: 회원이면 산 것·입은 것을 불러와 내 천동이에 입힘
  useEffect(() => {
    if (!ready || !auth?.user) return;
    fetch('/api/cosmetics', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setWardrobe(d);
        apiRef.current?.setLook?.(d.equipped);
      })
      .catch(() => {});
  }, [ready, auth?.user]);
  const wear = async (item) => {
    if (!auth?.user) return notify?.('천동이 꾸미기는 로그인하면 할 수 있어요.');
    const own = wardrobe?.owned?.includes(item.id);
    const on = wardrobe?.equipped?.[item.slot] === item.id;
    let url = '/api/cosmetics/equip';
    let body = { slot: item.slot, id: on ? null : item.id };
    if (!own) {
      const bal = wardrobe?.balance ?? 0;
      if (bal < item.credits) {
        if (await askConfirm({ title: '금전이 조금 모자라요', message: `${item.label}에는 ${fmtCredits(item.credits)}이 필요해요. 지금 ${fmtCredits(bal)} 있어요.`, note: '충전 화면으로 가면 별마루에서 나가요.', ok: '충전하러 가기', cancel: '다음에' })) navigate('/wallet');
        return;
      }
      if (!(await askConfirm({ title: `${item.label}를 살까요?`, message: `${fmtCredits(item.credits)}을 쓰면 바로 입혀 드려요. 한 번 사면 계속 쓸 수 있어요.`, ok: `${fmtCredits(item.credits)}으로 사기` }))) return;
      url = '/api/cosmetics/buy';
      body = { id: item.id };
    }
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) return notify?.(d?.error || '바꾸지 못했어요.');
    setWardrobe(d);
    apiRef.current?.setLook?.(d.equipped);
    if (!own) trackEvent('plaza_cosmetic_buy', { id: item.id });
  };

  // 하늘 소원 등불 응원
  const cheerWish = async (w) => {
    if (!auth?.user) return notify?.('소원을 응원하려면 로그인해 주세요.');
    const r = await fetch('/api/wish/cheer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: w.id }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) return notify?.(d?.error || '응원하지 못했어요.');
    trackEvent('plaza_wish_cheer');
    setCard({ kind: 'wish', wish: { ...w, cheered: true, cheers: d.cheers ?? w.cheers + 1 } });
  };

  useEffect(() => {
    trackEvent('plaza_enter', { member: auth?.user ? 'yes' : 'no' });
    const t = setTimeout(() => setHelp(false), 7000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEvent = function (type) {
    if (type === 'qi-walk') setQi('walk');
    else if (type === 'qi-start') setQi('on');
    else if (type === 'qi-cancel') setQi(null);
    else if (type === 'lantern-up') setCard({ kind: 'lantern' });
    else if (type === 'hermitage') setNearHut(!!arguments[1]);
    else if (type === 'wish') {
      setCard({ kind: 'wish', wish: arguments[1] });
      trackEvent('plaza_wish_open');
    }
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
        const { list, added } = unlockToday();
        setMansions(list);
        if (added) apiRef.current?.addMansion?.(added.id);
        setCard({ kind: 'stars', mansion: added });
      }
    } else if (a.id === 'lantern') openCompose();
  };
  // 별마루 밖 화면으로 갈 때는 먼저 알림 (2026-11-15 사용자 지시: 게임 안에서 갑자기 나가지 않게)
  const leave = async (label, go) => {
    if (await askConfirm({ title: '별마루에서 나갈까요?', message: `${label}을 보려면 별마루 밖 화면으로 이동해요.`, note: '다시 들어오면 마당 처음 자리에서 시작해요. 오늘 헤아린 별은 그대로 남아요.', ok: '이동하기', cancel: '머물기' })) go();
  };
  // 등불에 소원 담기 (2026-11-15 사용자 지시: 소원빌기 화면으로 나가지 않고 별마루 안에서 — 쓰고 띄우면 내 자리에서 등불이 오르고 소원 목록에도 올라감)
  const [compose, setCompose] = useState({ text: '', big: false, pub: true, busy: false, balance: null });
  const openCompose = (big = false) => {
    setCompose((c) => ({ ...c, big, busy: false }));
    setCard({ kind: 'compose' });
    if (auth?.user)
      fetch('/api/wallet', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setCompose((c) => ({ ...c, balance: d.balance ?? 0 })))
        .catch(() => {});
  };
  const plainLantern = () => {
    setCard(null);
    apiRef.current?.lantern({ quiet: true });
  };
  const sendWish = async () => {
    if (!auth?.user) return openLogin?.('등불에 소원을 담으려면 로그인해 주세요.');
    const text = compose.text.trim();
    const bad = wishProblem(text);
    if (bad) return notify?.(bad);
    const offer = compose.big ? 10 : 0;
    if (offer && compose.balance != null && compose.balance < offer) {
      if (await askConfirm({ title: '금전이 조금 모자라요', message: `큰 등불에는 ${fmtCredits(offer)}이 필요해요. 지금 ${fmtCredits(compose.balance)} 있어요.`, note: '충전 화면으로 가면 별마루에서 나가요.', ok: '충전하러 가기', cancel: '다음에' })) navigate('/wallet');
      return;
    }
    setCompose((c) => ({ ...c, busy: true }));
    const r = await fetch('/api/wish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, cat: 'etc', pub: compose.pub, offer }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) {
      setCompose((c) => ({ ...c, busy: false }));
      if (d.reason === 'no_credit') {
        if (await askConfirm({ title: '금전이 조금 모자라요', message: `큰 등불에는 ${fmtCredits(offer)}이 필요해요.`, note: '충전 화면으로 가면 별마루에서 나가요.', ok: '충전하러 가기', cancel: '다음에' })) navigate('/wallet');
        return;
      }
      return notify?.(d.error || '등불을 띄우지 못했어요. 잠시 뒤 다시 해 주세요.');
    }
    trackEvent('wish_post', { from: 'plaza', offer });
    trackEvent('plaza_action', { type: offer ? 'wish_big' : 'wish' });
    setCard(null);
    setCompose((c) => ({ ...c, text: '', busy: false, balance: c.balance != null ? c.balance - offer : c.balance }));
    if (offer && compose.balance != null) announceBalance(compose.balance - offer);
    apiRef.current?.lantern({ wish: d.wish, big: offer >= 10 });
    // 등불이 하늘에 닿을 즈음 알림 카드
    setTimeout(() => setCard({ kind: 'sent', wish: d.wish, big: offer >= 10 }), 3800);
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
          <Byeolmaru3D nick={nick} joyRef={joyRef} apiRef={apiRef} onEvent={onEvent} starCount={stars} sky={sky} guardian={guardian} mansions={mansions} onReady={() => setReady(true)} onFail={() => setFailed(true)} />
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
          <span className="bm-exit-text">나가기</span>
        </button>
        <span className="bm-place">
          별마루 <small>天文</small>
          {people != null && <em className="bm-people">{people}명</em>}
        </span>
        {stars > 0 && (
          <span className="bm-stars" aria-label={`오늘 헤아린 별 ${stars}개`}>
            ★ {stars} <small>/ {STAR_GOAL}</small>
          </span>
        )}
        <button type="button" className="bm-icon-btn" onClick={() => setBook(true)} aria-label={`별자리 도감 ${mansions.length}/28`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 18l5-7 4 4 3-6 4 9" />
            <circle cx="4" cy="18" r="1.3" fill="currentColor" />
            <circle cx="9" cy="11" r="1.3" fill="currentColor" />
            <circle cx="13" cy="15" r="1.3" fill="currentColor" />
            <circle cx="16" cy="9" r="1.3" fill="currentColor" />
            <circle cx="20" cy="18" r="1.3" fill="currentColor" />
          </svg>
        </button>
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

      {ready && nearHut && !hut && (
        <button type="button" className="bm-enter" onClick={() => { setHut({ oracle: todayOracle(), shaking: false }); trackEvent('plaza_hut_enter'); }}>
          천둥도사의 암자에 들어가기
        </button>
      )}

      {hut && (
        <div className="contact-overlay bm-photo-overlay" onMouseDown={(e) => e.target === e.currentTarget && setHut(null)}>
          <div className="bm-settings bm-hut" role="dialog" aria-modal="true" aria-labelledby="bm-hut-title">
            <p className="bm-card-kicker">天動庵 · 천둥도사의 암자</p>
            <h2 id="bm-hut-title" className="bm-set-title">오늘의 점괘</h2>
            {!hut.oracle ? (
              <>
                <p className="bm-hut-say">마음속으로 궁금한 것 하나를 떠올리고, 산통을 흔들어 보거라.</p>
                <div className={`bm-tong${hut.shaking ? ' is-shaking' : ''}`} aria-hidden="true">
                  <span className="bm-tong-sticks"><i /><i /><i /><i /><i /></span>
                  <span className="bm-tong-body">籤</span>
                </div>
                <button
                  type="button"
                  className="bm-set-sleep"
                  disabled={hut.shaking}
                  onClick={() => {
                    setHut((h) => ({ ...h, shaking: true }));
                    trackEvent('plaza_oracle');
                    setTimeout(() => setHut({ oracle: drawOracle(), shaking: false }), 1600);
                  }}
                >
                  {hut.shaking ? '산통을 흔드는 중…' : '산통 흔들기'}
                  <small>하루에 한 번, 무료예요</small>
                </button>
              </>
            ) : (
              <>
                <div className="bm-oracle">
                  <span className="bm-oracle-rank">{hut.oracle.rank}</span>
                  <p className="bm-oracle-words">{hut.oracle.words}</p>
                  <p className="bm-oracle-ko">{hut.oracle.ko}</p>
                  <p className="bm-oracle-line">{hut.oracle.line}</p>
                </div>
                <p className="bm-hut-note">오늘의 점괘는 하루에 한 번이에요. 더 깊이 묻고 싶다면</p>
                <div className="bm-card-actions">
                  <button type="button" className="bm-card-ghost" onClick={() => leave('타로', () => navigate('/tarot'))}>
                    타로 보기
                  </button>
                  <button type="button" className="bm-card-main" onClick={() => leave('평생 사주', () => { saveTopic('overall'); navigate('/start'); })}>
                    평생 사주 보기
                  </button>
                </div>
              </>
            )}
            <button type="button" className="bm-photo-close" onClick={() => setHut(null)}>
              암자에서 나가기
            </button>
          </div>
        </div>
      )}

      {dress && (
        <div className="contact-overlay bm-photo-overlay" onMouseDown={(e) => e.target === e.currentTarget && setDress(false)}>
          <div className="bm-settings" role="dialog" aria-modal="true" aria-labelledby="bm-dress-title">
            <h2 id="bm-dress-title" className="bm-set-title">
              천동이 꾸미기 {wardrobe && <small>지금 {fmtCredits(wardrobe.balance)}</small>}
            </h2>
            {!auth?.user && <p className="bm-hut-say">로그인하면 금전으로 천동이를 꾸밀 수 있어요. 산 아이템은 그 계정에서 계속 쓸 수 있어요.</p>}
            {[
              ['hat', '머리'],
              ['color', '옷 색'],
              ['cushion', '방석'],
            ].map(([slot, name]) => (
              <div key={slot} className="bm-book-group">
                <p className="bm-book-head">{name}</p>
                <ul className="bm-dress-grid">
                  {COSMETICS.filter((c) => c.slot === slot).map((c) => {
                    const own = wardrobe?.owned?.includes(c.id);
                    const on = wardrobe?.equipped?.[c.slot] === c.id;
                    return (
                      <li key={c.id}>
                        <button type="button" className={`bm-dress-item${on ? ' is-on' : ''}`} onClick={() => wear(c)}>
                          <span className={`bm-dress-sw sw-${c.id}`} aria-hidden="true" style={c.color ? { background: c.color } : undefined} />
                          <b>{c.label}</b>
                          <span className="bm-dress-state">{on ? '입는 중 · 벗기' : own ? '입기' : <PriceTag n={c.credits} size={14} />}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <p className="bm-hut-note">금전으로 산 아이템은 바로 쓰는 디지털 콘텐츠라 환불이 어려워요.</p>
            <button type="button" className="bm-photo-close" onClick={() => setDress(false)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {book && (
        <div className="contact-overlay bm-photo-overlay" onMouseDown={(e) => e.target === e.currentTarget && setBook(false)}>
          <div className="bm-settings bm-book" role="dialog" aria-modal="true" aria-labelledby="bm-book-title">
            <h2 id="bm-book-title" className="bm-set-title">
              별자리 도감 <small>{mansions.length} / 28</small>
            </h2>
            <p className="bm-hut-say">하루에 별 108개를 헤아리면 동양 별자리 28수(二十八宿) 가운데 하나가 하늘에 그려져요.</p>
            {M_GROUPS.map((g) => (
              <div key={g.id} className="bm-book-group">
                <p className="bm-book-head" style={{ color: g.color }}>
                  {g.id} <small>{g.dir}</small>
                </p>
                <ul className="bm-book-grid">
                  {MANSIONS.filter((m) => m.group === g.id).map((m) => {
                    const got = mansions.find((x) => x.id === m.id);
                    return (
                      <li key={m.id} className={got ? 'is-got' : ''} style={got ? { borderColor: g.color } : undefined}>
                        <b>{m.hanja}</b>
                        <span>{got ? `${m.ko} · ${got.date.slice(5).replace('-', '.')}` : m.ko}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <p className="bm-hut-note">하늘의 별자리 모양은 실제 별 배치가 아니라 그림이에요.</p>
            <button type="button" className="bm-photo-close" onClick={() => setBook(false)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {settings && (
        <div className="contact-overlay bm-photo-overlay" onMouseDown={(e) => e.target === e.currentTarget && setSettings(false)}>
          <div className="bm-settings" role="dialog" aria-modal="true" aria-labelledby="bm-set-title">
            <h2 id="bm-set-title" className="bm-set-title">별마루 설정</h2>
            <button type="button" className="bm-set-dress" onClick={() => { setSettings(false); setDress(true); trackEvent('plaza_dress_open'); }}>
              천동이 꾸미기 <span>갓·꽃비녀·옷 색·금빛 방석</span>
            </button>
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
                <button type="button" className="bm-card-main" onClick={() => leave('오늘의 운세', () => { saveTopic('today'); navigate('/start'); })}>
                  오늘의 운세도 보기
                </button>
              </div>
            </>
          )}
          {card.kind === 'lantern' && (
            <>
              <p id="bm-card-title" className="bm-card-text">등불이 하늘로 올라가요</p>
              <div className="bm-card-actions">
                <button type="button" className="bm-card-main" onClick={() => openCompose()}>
                  소원 담아 띄우기
                </button>
              </div>
            </>
          )}
          {card.kind === 'compose' && (
            <>
              <p className="bm-card-kicker">등불에 소원 담기</p>
              {auth?.user ? (
                <>
                  <textarea
                    className="bm-wish-input"
                    value={compose.text}
                    maxLength={WISH_MAX}
                    rows={3}
                    placeholder="하늘에 띄울 소원을 적어 주세요"
                    aria-label="소원"
                    onChange={(e) => setCompose((c) => ({ ...c, text: e.target.value }))}
                  />
                  <p className="bm-wish-count">
                    {compose.text.length}/{WISH_MAX} · 이름·연락처는 적지 말아 주세요
                  </p>
                  <div className="bm-wish-seg" role="radiogroup" aria-label="등불 크기">
                    <button type="button" role="radio" aria-checked={!compose.big} className={compose.big ? '' : 'on'} onClick={() => setCompose((c) => ({ ...c, big: false }))}>
                      등불 <small>무료</small>
                    </button>
                    <button type="button" role="radio" aria-checked={compose.big} className={compose.big ? 'on' : ''} onClick={() => setCompose((c) => ({ ...c, big: true }))}>
                      큰 등불 <PriceTag n={10} size={13} />
                    </button>
                  </div>
                  <p className="bm-wish-note">
                    {compose.big ? '하늘에 더 크고 밝게 떠요' : '하늘에 등불로 떠요'}
                    {compose.balance != null && ` · 지금 ${fmtCredits(compose.balance)}`}
                  </p>
                  <label className="bm-wish-pub">
                    <input type="checkbox" checked={!compose.pub} onChange={(e) => setCompose((c) => ({ ...c, pub: !e.target.checked }))} /> 나만 보기 (다른 사람 하늘엔 안 떠요)
                  </label>
                  <div className="bm-card-actions">
                    <button type="button" className="bm-card-ghost" onClick={plainLantern}>
                      그냥 띄우기
                    </button>
                    <button type="button" className="bm-card-main" onClick={sendWish} disabled={compose.busy || !compose.text.trim()}>
                      {compose.busy ? '띄우는 중…' : compose.big ? '큰 등불 띄우기' : '등불 띄우기'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p id="bm-card-title" className="bm-card-sub">
                    로그인하면 등불에 소원을 담아 띄울 수 있어요. 띄운 소원은 소원빌기 하늘에도 함께 올라가요.
                  </p>
                  <div className="bm-card-actions">
                    <button type="button" className="bm-card-ghost" onClick={plainLantern}>
                      그냥 띄우기
                    </button>
                    <button type="button" className="bm-card-main" onClick={() => openLogin?.('등불에 소원을 담으려면 로그인해 주세요.')}>
                      로그인하기
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          {card.kind === 'sent' && (
            <>
              <p className="bm-card-kicker">{card.big ? '큰 등불이 하늘에 닿았어요' : '등불이 하늘에 닿았어요'}</p>
              <p id="bm-card-title" className="bm-card-text">
                {card.wish?.text}
              </p>
              <p className="bm-card-sub">소원빌기 하늘에도 함께 올라갔어요. 하늘의 등불을 누르면 다시 볼 수 있어요.</p>
              <div className="bm-card-actions">
                <button type="button" className="bm-card-ghost" onClick={() => leave('소원 구경하기', () => navigate('/wish'))}>
                  소원 구경하기
                </button>
                <button type="button" className="bm-card-main" onClick={() => setCard(null)}>
                  닫기
                </button>
              </div>
            </>
          )}
          {card.kind === 'wish' && (
            <>
              <p className="bm-card-kicker">
                하늘에 떠 있는 소원{card.wish.offer > 0 ? ` · ${card.wish.offer}금전의 정성` : ''}
              </p>
              <p id="bm-card-title" className="bm-card-text">
                {card.wish.text}
              </p>
              <div className="bm-card-actions">
                <button type="button" className="bm-card-ghost" onClick={() => setCard(null)}>
                  닫기
                </button>
                <button type="button" className="bm-card-main" onClick={() => cheerWish(card.wish)} disabled={card.wish.cheered}>
                  {card.wish.cheered ? '응원했어요' : '응원하기'} {card.wish.cheers}
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
              {card.mansion && (
                <p className="bm-card-sub">
                  별자리 <b>{card.mansion.hanja}({card.mansion.ko})</b>가 하늘에 그려졌어요. 도감에서 볼 수 있어요.
                </p>
              )}
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
