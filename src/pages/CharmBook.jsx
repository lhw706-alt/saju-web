// 부적 도감 (/charms, 마이페이지 /my/charms) — 2026-11-13
// 출석 스탬프판 형식(레퍼런스: 출석 스탬프 화면): 인사 → 천둥도사 그림 → 모은 수 + 펼치기 버튼 → 연속 일수 →
// 4열 스탬프 칸(모은 부적 = 오행 도장 + 받은 날, 못 모은 부적 = 회색 칸) → 안내 상자 → 규칙 → 아래 고정 버튼.
// 모은 부적은 이 브라우저(localStorage), 회원은 계정에도 (src/lib/fortunes.js).
// '오늘의 부적 펼치기'는 Layout 의 FortuneFab 창을 엶 (window 이벤트 saju:open-fortune). 펼치면 saju:book 이벤트로 바로 갱신.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FORTUNES, LUCKY, EL_HANJA, loadBook, streak, syncBook, collectedToday } from '../lib/fortunes.js';
import { dosaArtSvg } from '../brand/dosaArt.js';
import MemberCta from '../components/MemberCta.jsx';
import { trackEvent } from '../lib/analytics.js';

const HERO_ART = dosaArtSvg('charm');
const fmt = (d) => (d ? d.replace(/^(\d+)-0?(\d+)-0?(\d+)$/, '$2.$3') : '');
const fmtFull = (d) => (d ? d.replace(/^(\d+)-0?(\d+)-0?(\d+)$/, '$1.$2.$3') : '');
const openFortune = () => {
  trackEvent('fortune_open_from_book');
  window.dispatchEvent(new Event('saju:open-fortune'));
};

// embedded: 마이페이지 '부적 도감' 탭 안에 넣을 때 (로그인 안내 카드 없이)
export default function CharmBook({ embedded = false }) {
  const [book, setBook] = useState(loadBook);
  const [days, setDays] = useState(streak);
  const [today, setToday] = useState(collectedToday);
  const refresh = () => {
    setBook(loadBook());
    setDays(streak());
    setToday(collectedToday());
  };
  // 오늘의 운세 창에서 펼치면 바로 반영
  useEffect(() => {
    window.addEventListener('saju:book', refresh);
    return () => window.removeEventListener('saju:book', refresh);
  }, []);
  // 회원: 계정에 저장된 도감과 합쳐서 보여 줌 (다른 기기에서 모은 부적도)
  const { auth } = useOutletContext();
  useEffect(() => {
    if (!auth.user) return;
    syncBook().then((ok) => ok && refresh());
  }, [auth.user]);
  const navigate = useNavigate();
  useEffect(() => {
    if (!embedded && auth.user) navigate('/my/charms', { replace: true });
  }, [embedded, auth.user, navigate]);

  const [open, setOpen] = useState(null);
  const detailRef = useRef(null);
  useEffect(() => {
    if (open != null) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [open]);
  const got = Object.keys(book).length;
  const left = FORTUNES.length - got;
  const sel = open != null ? FORTUNES[open] : null;
  const Title = embedded ? 'h2' : 'h1';

  return (
    <section className={embedded ? 'book is-embedded' : 'book'}>
      <Title className="book-hello">
        오늘도 만나서 반가워요!
        <br />
        {today ? '내일 또 새 부적을 펼쳐 주세요.' : '오늘의 부적을 펼쳐 주세요.'}
      </Title>

      <div className="book-hero" aria-hidden="true" dangerouslySetInnerHTML={{ __html: HERO_ART }} />

      <div className="book-count">
        <div>
          <p className="book-count-num">
            <b>{got}장</b> / {FORTUNES.length}장
          </p>
          <p className="book-count-sub">{got ? `벌써 부적 ${got}장을 모았어요!` : '아직 모은 부적이 없어요.'}</p>
        </div>
        <button type="button" className="book-count-btn" onClick={openFortune} disabled={today}>
          {today ? '오늘 완료' : '펼치기'}
        </button>
      </div>

      <p className="book-streak">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2c1 4 5 5.5 5 10.5A5 5 0 0 1 7 12.5c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9z" fill="#ff8a4c" />
        </svg>
        {days > 0 ? `${days}일 연속으로 펼치는 중!` : '오늘부터 하루 한 장씩 모아 봐요!'}
      </p>

      <ul className="book-grid">
        {FORTUNES.map((f, i) => {
          const rec = book[i];
          const wide = i === FORTUNES.length - 1 && FORTUNES.length % 4 === 1; // 마지막 한 칸은 넓게
          return (
            <li key={f.title} className={wide ? 'is-wide' : undefined}>
              {rec ? (
                <button
                  type="button"
                  className={`stamp is-got el-${f.el}${open === i ? ' on' : ''}`}
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  aria-label={`${f.title}, ${fmtFull(rec.first)}에 모음`}
                >
                  <span className="stamp-seal" aria-hidden="true">
                    {EL_HANJA[f.el]}
                  </span>
                  <span className="stamp-date">{fmt(rec.first)}</span>
                  {rec.count > 1 && <span className="stamp-count">×{rec.count}</span>}
                </button>
              ) : (
                <div className="stamp is-locked" aria-label="아직 모으지 않은 부적">
                  <span className="stamp-seal" aria-hidden="true">
                    {EL_HANJA[f.el]}
                  </span>
                  <span className="stamp-date" aria-hidden="true">
                    ?
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {sel && (
        <div className="book-detail" role="status" ref={detailRef}>
          <span className="fortune__kicker">
            {EL_HANJA[sel.el]} · 처음 받은 날 {fmtFull(book[open].first)}
            {book[open].count > 1 ? ` · ${book[open].count}번 받음` : ''}
          </span>
          <strong>{sel.title}</strong>
          <p>{sel.text}</p>
          <p className="book-tip">{sel.tip}</p>
          <p className="book-lucky">
            행운의 색 <i style={{ background: LUCKY[sel.el].hex }} aria-hidden="true" /> {LUCKY[sel.el].name} · 행운의 방향 {LUCKY[sel.el].dir}
          </p>
        </div>
      )}

      <p className="book-cheer">{left ? `${left}장 남았어요. 내일도 부적을 펼쳐 보세요!` : '부적 도감을 모두 채웠어요! 천둥도사도 놀랐어요.'}</p>

      <div className="book-goal">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="var(--primary)" />
          <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#1b1c1e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        부적 {FORTUNES.length}장을 모두 모으면 도감이 완성돼요.
      </div>

      {!embedded && (
        <MemberCta
          place="charms"
          title="휴대폰을 바꿔도 도감이 이어져요"
          text="지금은 이 브라우저에만 남아 있어요. 로그인하면 모은 부적과 연속 기록을 계정에 간직해 드려요."
          reason="로그인하면 천둥도사가 모은 부적을 계정에 고이 간직해 드려요."
        />
      )}

      <div className="book-bottom">
        <button type="button" className="btn-primary" onClick={openFortune} disabled={today}>
          {today ? '오늘의 부적을 펼쳤어요 · 내일 또 만나요' : '오늘의 부적 펼치기'}
        </button>
      </div>
    </section>
  );
}
