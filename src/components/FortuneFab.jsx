import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { trackEvent } from '../lib/analytics.js';
import { saveTopic } from '../lib/storage.js';
import { ShareButtons } from './ShareRow.jsx';
import { FORTUNES, LUCKY, EL_HANJA, collect, drawIndex, loadBook, syncBook } from '../lib/fortunes.js';

// 오른쪽 아래 '오늘의 운세' 플로팅 부적 (다모아픽 FortuneFab 을 사주천문 다크·금박 스타일로 옮김).
// - 금박 부적을 긁으면 오늘의 운세가 드러남. 하루 한 번: 이 브라우저(localStorage)에 날짜·운세 번호만 저장, 서버로 안 보냄
// - 재미로 보는 무작위 운세 (사주와 무관하다고 고지). 공포·보장 표현 금지
// - 긁기 어려운 경우(키보드·보조기기)를 위해 '한 번에 펼치기' 버튼
const KEY = 'saju:fortune';
const REVEAL_RATIO = 0.45;

// 부적 데이터·도감: src/lib/fortunes.js

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
  const v = { date: todayKey(), idx: drawIndex(), num: 1 + Math.floor(Math.random() * 45), revealed: false };
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* 무시 */
  }
  return v;
}

// 펼친 부적을 도감에 넣고, 처음 모은 부적이면 true
function saveRevealed(v) {
  const isNew = collect(v.idx, v.date);
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...v, revealed: true }));
  } catch {
    /* 무시 */
  }
  return isNew;
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
  ctx.fillText('여기를 긁어 보세요', cx, by + bh / 2 + 1);
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
    <svg className="fortune-fab__charm" width="68" height="93" viewBox="0 0 22 30" aria-hidden="true" focusable="false">
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

// 공유: 카카오톡(로그인 회원만) · 링크 복사 — src/components/ShareRow.jsx. 공유 링크 /fortune 로 들어오면 운세 창이 열림

// loggedIn·onNeedLogin·onNotice: Layout 이 넘겨줌 (카카오 공유는 로그인 회원만, 결과 안내는 토스트)
export default function FortuneFab({ loggedIn = false, onNeedLogin, onNotice }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(null); // { date, idx, num, revealed }
  const panel = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const today = loadToday();
    if (today.revealed) collect(today.idx, today.date); // 도감이 생기기 전에 펼친 오늘 부적도 넣기
    setState(today);
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

  // 펼치기: 도감에 넣고, 처음 모은 부적이면 '새 부적' 안내(isNew)를 띄움
  const reveal = () => {
    const s = state;
    if (!s || s.revealed) return;
    const isNew = saveRevealed(s);
    if (loggedIn) syncBook(); // 회원: 도감을 계정에도
    trackEvent('fortune_reveal', { fortune: FORTUNES[s.idx].title, new_charm: isNew ? 1 : 0 });
    setState({ ...s, revealed: true, isNew });
  };

  // 부적 도감: 회원은 마이페이지 탭, 비회원은 /charms (로그인 안내 카드 포함)
  const goBook = () => {
    trackEvent('charm_book_open', { from: 'fortune_new' });
    close();
    navigate(loggedIn ? '/my/charms' : '/charms');
  };

  // 내 사주로 자세히: 평생 사주 입력 화면으로 (다 입력한 뒤 리포트)
  const goReading = () => {
    trackEvent('fortune_cta');
    saveTopic('overall');
    close();
    navigate('/start');
  };

  // 공유 링크(/fortune)로 들어오면 메인으로 바꾸고 운세 창을 엶
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname !== '/fortune') return;
    setOpen(true);
    navigate('/', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  // 카카오 공유하려다 로그인했으면 운세 창을 다시 열어 줌
  useEffect(() => {
    if (!loggedIn) return;
    try {
      if (sessionStorage.getItem('sc:afterLogin') === 'fortune') {
        sessionStorage.removeItem('sc:afterLogin');
        setOpen(true);
      }
    } catch {}
  }, [loggedIn]);

  // 카카오 공유하려는데 비로그인: 로그인하고 오면 운세 창을 다시 열어 줌
  const needLogin = () => {
    try {
      sessionStorage.setItem('sc:afterLogin', 'fortune');
    } catch {}
    close();
    onNeedLogin?.('천둥도사의 부적을 카카오톡으로 나누려면 로그인이 필요해요.');
  };

  const f = state && FORTUNES[state.idx];
  const lucky = f && LUCKY[f.el];

  return (
    <>
      <button type="button" className="fortune-fab" onClick={() => setOpen(true)} aria-haspopup="dialog" title="오늘의 운세">
        <CharmIcon />
        <span className="visually-hidden">오늘의 운세 부적 열기</span>
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
                {state?.revealed ? '내일 또 새 부적이 기다리고 있어요.' : '부적을 긁어서 오늘 운세를 확인해 보세요.'}
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
                  내 사주 풀이 보러 가기
                </button>
              )}

              {f && state.revealed && (
                <div className="fortune__share">
                  <ShareButtons
                    kakao={{ title: `오늘의 운세 · ${f.title}`, description: `${f.text} 나도 오늘의 부적을 긁어 볼까요?`, button: '내 운세 보기', image: 'share-fortune.png' }}
                    path="/fortune"
                    loggedIn={loggedIn}
                    onNeedLogin={needLogin}
                    onNotice={onNotice}
                    event="fortune_share"
                  />
                </div>
              )}

              {f && state.revealed && state.isNew && (
                <div className="fortune__new" role="status">
                  <span className={`fortune__new-seal el-${f.el}`} aria-hidden="true">
                    {EL_HANJA[f.el]}
                  </span>
                  <span className="fortune__new-text">
                    <b>새로운 부적을 얻었어요!</b>
                    <span>
                      도감에 {Object.keys(loadBook()).length}번째 부적이 모였어요. 보러 갈까요?
                    </span>
                  </span>
                  <button type="button" className="fortune__new-go" onClick={goBook}>
                    보러 가기
                  </button>
                </div>
              )}

              <p className="fortune__note">재미로 보는 운세예요. 사주와 상관없이 하루 한 장씩 뽑혀요.</p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
