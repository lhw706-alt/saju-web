import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../lib/analytics.js';
import { loadInput, saveTopic } from '../lib/storage.js';

// 오른쪽 아래 '오늘의 운세' 플로팅 부적 (다모아픽 FortuneFab 을 사주천문 다크·금박 스타일로 옮김).
// - 금박 부적을 긁으면 오늘의 운세가 드러남. 하루 한 번: 이 브라우저(localStorage)에 날짜·운세 번호만 저장, 서버로 안 보냄
// - 재미로 보는 무작위 운세 (사주와 무관하다고 고지). 공포·보장 표현 금지
// - 긁기 어려운 경우(키보드·보조기기)를 위해 '한 번에 펼치기' 버튼
const KEY = 'saju:fortune';
const REVEAL_RATIO = 0.45;

// el: 오늘의 기운(오행) → 행운의 색
const FORTUNES = [
  { title: '새싹운', el: 'wood', text: '작게 시작한 일이 생각보다 힘 있게 자라는 날이에요.', tip: '미뤄 둔 일 하나를 오늘 첫걸음만 떼어 보세요.' },
  { title: '인연운', el: 'fire', text: '먼저 건넨 인사 한마디가 좋은 인연으로 이어져요.', tip: '오랜만에 떠오른 사람에게 안부를 전해 보세요.' },
  { title: '안정운', el: 'earth', text: '서두르지 않아도 일이 제자리를 찾아가는 하루예요.', tip: '오늘은 계획보다 쉬는 시간을 먼저 정해 보세요.' },
  { title: '결단운', el: 'metal', text: '고민하던 일에 또렷한 답이 보이기 시작해요.', tip: '마음이 기우는 쪽을 메모로 적어 두세요.' },
  { title: '지혜운', el: 'water', text: '조용히 생각할수록 좋은 아이디어가 떠올라요.', tip: '잠들기 전 오늘 떠오른 생각을 적어 보세요.' },
  { title: '성장운', el: 'wood', text: '배우고 익힌 것이 오늘 쓸모를 찾아가요.', tip: '새로 알게 된 것 하나를 누군가와 나눠 보세요.' },
  { title: '활력운', el: 'fire', text: '몸을 움직일수록 기분과 운이 함께 밝아져요.', tip: '가까운 거리는 걸어서 다녀 보세요.' },
  { title: '신뢰운', el: 'earth', text: '꾸준히 지켜 온 약속이 든든한 믿음으로 돌아와요.', tip: '작은 약속 하나를 오늘 꼭 지켜 보세요.' },
  { title: '정리운', el: 'metal', text: '비우고 정리한 자리에 좋은 기운이 들어와요.', tip: '책상 위 한 칸만 깨끗이 치워 보세요.' },
  { title: '흐름운', el: 'water', text: '억지로 밀기보다 흐름을 타면 일이 술술 풀려요.', tip: '오늘은 상대의 속도에 맞춰 보세요.' },
  { title: '용기운', el: 'fire', text: '망설이던 말을 꺼내기 좋은 날이에요.', tip: '하고 싶은 말을 짧고 따뜻하게 건네 보세요.' },
  { title: '여유운', el: 'water', text: '한 박자 쉬어 갈 때 오히려 길이 잘 보여요.', tip: '따뜻한 차 한 잔과 함께 잠깐 멈춰 보세요.' },
  { title: '재물운', el: 'metal', text: '작은 지출을 살피면 마음까지 넉넉해지는 날이에요.', tip: '이번 주 쓴 돈을 한 번 훑어보세요.' },
  { title: '화합운', el: 'earth', text: '함께하는 자리에서 내 장점이 빛나요.', tip: '오늘은 내가 먼저 고마움을 표현해 보세요.' },
  { title: '기회운', el: 'wood', text: '스쳐 지나갈 수 있는 기회가 눈에 띄는 날이에요.', tip: '평소와 다른 길로 한 번 가 보세요.' },
  { title: '집중운', el: 'metal', text: '하나에만 몰두하면 생각보다 빨리 끝나요.', tip: '알림을 잠시 끄고 한 가지만 해 보세요.' },
  { title: '치유운', el: 'water', text: '지친 마음이 조금씩 풀리고 가벼워져요.', tip: '오늘은 일찍 잠자리에 들어 보세요.' },
  { title: '표현운', el: 'fire', text: '내 생각을 꺼낼수록 좋은 반응이 돌아와요.', tip: '글이든 말이든 하나를 표현해 보세요.' },
  { title: '든든운', el: 'earth', text: '미리 준비해 둔 것이 오늘을 지켜 줘요.', tip: '내일 할 일을 오늘 하나만 미리 챙겨 보세요.' },
  { title: '귀인운', el: 'wood', text: '도움이 필요할 때 손을 내미는 사람이 있어요.', tip: '혼자 끙끙대지 말고 먼저 물어보세요.' },
  { title: '복덕운', el: 'earth', text: '베푼 만큼 따뜻함이 되돌아오는 하루예요.', tip: '작은 친절 하나를 건네 보세요.' },
];

const LUCKY = {
  wood: { name: '초록', hex: '#6dbb8a', dir: '동쪽' },
  fire: { name: '빨강', hex: '#e8705f', dir: '남쪽' },
  earth: { name: '노랑', hex: '#d6a65a', dir: '가운데' },
  metal: { name: '흰색', hex: '#d2d5df', dir: '서쪽' },
  water: { name: '남색', hex: '#6b9be6', dir: '북쪽' },
};
const EL_HANJA = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function loadToday() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && v.date === todayKey() && FORTUNES[v.idx]) return v;
  } catch {
    /* 무시 */
  }
  const v = { date: todayKey(), idx: Math.floor(Math.random() * FORTUNES.length), num: 1 + Math.floor(Math.random() * 45), revealed: false };
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* 무시 */
  }
  return v;
}

function saveRevealed(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...v, revealed: true }));
  } catch {
    /* 무시 */
  }
}

// 긁는 층: 금박 부적 — 금속 그라데이션 + 미세 입자 + 사선 광택 + 반복 무늬, 가운데 붉은 福 도장, 안내 띠
function paintTalisman(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#b8923f');
  g.addColorStop(0.25, '#f3dc9a');
  g.addColorStop(0.5, '#c9a24f');
  g.addColorStop(0.75, '#f6e3a8');
  g.addColorStop(1, '#a9853a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const n = Math.round(w * h * 0.06);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,248,220,0.5)' : 'rgba(90,60,10,0.16)';
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#fffbe8';
  for (let x = -h; x < w; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + h, 0);
    ctx.lineTo(x + h + 10, 0);
    ctx.lineTo(x + 10, h);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.fillStyle = 'rgba(110,74,16,0.16)';
  ctx.font = '600 12px "ChosunSm", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 18, r = 0; y < h; y += 26, r++) {
    for (let x = (r % 2) * 30 + 14; x < w; x += 60) ctx.fillText('福 天 文', x, y);
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(160,32,38,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.lineWidth = 1;
  ctx.strokeRect(15, 15, w - 30, h - 30);
  ctx.restore();
  const cx = w / 2;
  const cy = h * 0.42;
  const r = Math.min(w, h) * 0.2;
  ctx.fillStyle = 'rgba(255,246,220,0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b5262c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#b5262c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(r * 1.05)}px "ChosunSm", serif`;
  ctx.fillText('福', cx, cy + 2);
  const by = h * 0.72;
  const bw = w * 0.66;
  const bh = 34;
  const bx = cx - bw / 2;
  ctx.fillStyle = 'rgba(27,28,30,0.78)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 17);
  else ctx.rect(bx, by, bw, bh);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 14px "Pretendard JP Variable", "Pretendard Variable", Pretendard, sans-serif';
  ctx.fillText('손가락으로 문질러 긁어 보세요', cx, by + bh / 2 + 1);
}

function Scratch({ onReveal }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const moves = useRef(0);
  const done = useRef(false);

  useEffect(() => {
    const c = ref.current;
    const paint = () => {
      const rect = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = rect.width * dpr;
      c.height = rect.height * dpr;
      const ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      paintTalisman(ctx, rect.width, rect.height);
    };
    paint();
    // 도장 글자(조선신명조)가 늦게 받아지면 긁기 전에 한 번 다시 그림
    document.fonts?.load('600 40px "ChosunSm"', '福天文').then(() => moves.current === 0 && paint()).catch(() => {});
  }, []);

  const ratio = () => {
    const c = ref.current;
    const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    let clear = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 40) {
      total++;
      if (data[i] === 0) clear++;
    }
    return clear / total;
  };

  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const scratch = (p) => {
    const ctx = ref.current.getContext('2d');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 42;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const from = last.current || p;
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (++moves.current % 8 === 0 && !done.current && ratio() > REVEAL_RATIO) {
      done.current = true;
      onReveal();
    }
  };

  return (
    <canvas
      ref={ref}
      className="fortune__scratch"
      aria-hidden="true"
      onPointerDown={(e) => {
        drawing.current = true;
        last.current = null;
        e.currentTarget.setPointerCapture(e.pointerId);
        scratch(pos(e));
      }}
      onPointerMove={(e) => drawing.current && scratch(pos(e))}
      onPointerUp={() => {
        drawing.current = false;
        last.current = null;
      }}
      onPointerCancel={() => {
        drawing.current = false;
      }}
    />
  );
}

// 부적 아이콘: 금박 종이 + 붉은 테두리·福 도장 (사주천문 자체 도안)
function CharmIcon() {
  return (
    <svg className="fortune-fab__charm" width="26" height="35" viewBox="0 0 22 30" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="saju-charm-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e3a8" />
          <stop offset="0.5" stopColor="#e2c172" />
          <stop offset="1" stopColor="#c99e45" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="20" height="28" rx="2.5" fill="url(#saju-charm-paper)" />
      <rect x="3" y="3" width="16" height="24" rx="1.2" fill="none" stroke="#b5262c" strokeWidth="1.2" />
      <circle cx="11" cy="11.5" r="5" fill="none" stroke="#b5262c" strokeWidth="1.3" />
      <text x="11" y="14.6" textAnchor="middle" fontSize="8" fontWeight="600" fill="#b5262c" fontFamily="ChosunSm, Batang, serif">
        福
      </text>
      <path d="M6.5 20.5q4.5-2 9 0M6.5 23.5q4.5-2 9 0" fill="none" stroke="#b5262c" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export default function FortuneFab() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(null); // { date, idx, num, revealed }
  const panel = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    setState(loadToday());
    trackEvent('fortune_open');
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    setTimeout(() => panel.current?.focus(), 0);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const reveal = () => {
    setState((s) => {
      if (!s || s.revealed) return s;
      saveRevealed(s);
      trackEvent('fortune_reveal', { fortune: FORTUNES[s.idx].title });
      return { ...s, revealed: true };
    });
  };

  // 내 사주로 자세히: 입력해 둔 생년월일이 있으면 결과 화면에서 바로 풀이, 없으면 메인 입력칸으로
  const goReading = () => {
    trackEvent('fortune_cta');
    saveTopic('overall');
    close();
    navigate(loadInput() ? '/result' : '/#start');
  };

  const f = state && FORTUNES[state.idx];
  const lucky = f && LUCKY[f.el];

  return (
    <>
      <button type="button" className="fortune-fab" onClick={() => setOpen(true)} aria-haspopup="dialog" title="오늘의 운세">
        <CharmIcon />
        <span className="fortune-fab__label">오늘의 운세</span>
      </button>

      {open &&
        createPortal(
          <div className="fortune-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
            <div className="fortune" role="dialog" aria-modal="true" aria-labelledby="fortune-title" tabIndex={-1} ref={panel}>
              <button type="button" className="fortune__close" aria-label="운세 창 닫기" onClick={close}>
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <h2 id="fortune-title" className="fortune__title">
                오늘의 운세
              </h2>
              <p className="fortune__lead">
                {state?.revealed ? '오늘의 부적을 열었어요. 내일 또 새 부적이 기다려요.' : '하루에 한 번, 금박 부적을 긁어 오늘의 운을 확인해 보세요.'}
              </p>

              {f && (
                <div className={`fortune__card${state.revealed ? ' is-revealed' : ''}`}>
                  <div className="fortune__result" aria-hidden={!state.revealed}>
                    <span className="fortune__seal" aria-hidden="true">福</span>
                    <span className="fortune__kicker">오늘의 기운 · {EL_HANJA[f.el]}</span>
                    <strong className="fortune__name">{f.title}</strong>
                    <p className="fortune__text">{f.text}</p>
                    <p className="fortune__tip">{f.tip}</p>
                    <ul className="fortune__lucky">
                      <li>
                        <span>행운의 색</span>
                        <b>
                          <i style={{ background: lucky.hex }} aria-hidden="true" />
                          {lucky.name}
                        </b>
                      </li>
                      <li>
                        <span>행운의 숫자</span>
                        <b>{state.num}</b>
                      </li>
                      <li>
                        <span>행운의 방향</span>
                        <b>{lucky.dir}</b>
                      </li>
                    </ul>
                  </div>
                  {!state.revealed && <Scratch onReveal={reveal} />}
                </div>
              )}

              {f && !state.revealed && (
                <button type="button" className="fortune__open" onClick={reveal}>
                  긁기 어려우면 한 번에 펼치기
                </button>
              )}

              {f && state.revealed && (
                <button type="button" className="btn-primary fortune__cta" onClick={goReading}>
                  내 사주로 자세히 풀어 보기
                </button>
              )}

              <p className="fortune__note">재미로 보는 운세예요. 내 사주와 상관없이 하루 한 장 무작위로 뽑혀요.</p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
