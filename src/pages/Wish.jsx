// 소원빌기 (/wish, 2026-11-14 사용자 기획안) — 로그인한 사람이 소원을 하늘에 띄우고, 다른 사람의 소원을 구경·응원하는 참여형 콘텐츠.
// 화면: 밤하늘(떠다니는 최근 소원) + 현황 → [내 소원 띄우기] → 작성 창(100자·종류·공개 범위) → 하늘로 올라가는 연출
//      → 소원 구경하기(최신·인기·종류, 응원·신고) · 내 소원 보관함(전체·이루어진·진행 중, 이루어졌어요·삭제, 30일 다시 보기 안내).
// 서버 /api/wish*(netlify/functions/auth.mjs), 규칙 src/lib/wish.js. 다른 사람에게는 익명으로만 보임. 이모지 대신 글래스 아이콘.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { WISH_CATS, WISH_MAX, WISH_DAILY, wishCat, wishProblem } from '../lib/wish.js';
import LiquidMetalButton from '../components/LiquidMetalButton.jsx';
import { trackEvent } from '../lib/analytics.js';
import { dosaArtSvg } from '../brand/dosaArt.js';

// 3D 천동이 + 둘레를 도는 빛나는 별 (2026-11-14 사용자 지시). 불러오는 동안·WebGL 이 없으면 2D 그림
const Mascot3D = lazy(() => import('../components/Mascot3D.jsx'));

// 소원 종류 → 행운의 부적 종류
export const WISH_TO_TALISMAN = { love: 'love', money: 'money', career: 'career', health: 'health', study: 'study', etc: 'luck' };
const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}일 전` : new Date(iso).toLocaleDateString('ko-KR');
};
const ymd = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};
const api = async (url, opts = {}) => {
  const r = await fetch(url, { cache: 'no-store', ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } }).catch(() => null);
  const d = await r?.json().catch(() => ({}));
  return { ok: !!r?.ok, status: r?.status || 0, data: d || {} };
};

function WishCard({ w, member, onCheer, onReport }) {
  const c = wishCat(w.cat);
  return (
    <li className={`wish-row${w.done ? ' is-done' : ''}${w.mine ? ' is-mine' : ''}`}>
      <p className="wish-row-text">{w.text}</p>
      <div className="wish-row-foot">
        <span className="wish-row-meta">
          {c?.label} · {ago(w.createdAt)}
          {w.mine && <em> · 나의 소원</em>}
          {w.done && <em className="is-done"> · 이루어졌어요</em>}
        </span>
        <button type="button" className={`wish-row-cheer${w.cheered ? ' on' : ''}`} onClick={() => onCheer(w)} aria-pressed={!!w.cheered} disabled={!!w.cheered}>
          {w.cheered ? '응원했어요' : '응원하기'} <b>{w.cheers}</b>
        </button>
        {member && !w.mine && (
          <button type="button" className="wish-report" onClick={() => onReport(w)} aria-label="이 소원 신고하기">
            신고
          </button>
        )}
      </div>
    </li>
  );
}

export default function Wish() {
  const navigate = useNavigate();
  const { auth, openLogin, notify } = useOutletContext();
  const member = !!auth?.user;
  const [tab, setTab] = useState('feed'); // feed | mine
  const [sort, setSort] = useState('new');
  const [cat, setCat] = useState('');
  const [feed, setFeed] = useState(null);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [top, setTop] = useState([]); // 이번 주 응원 많이 받은 소원 TOP 5
  const [week, setWeek] = useState(null);
  const [openTop, setOpenTop] = useState(null);
  const [mine, setMine] = useState(null);
  const [left, setLeft] = useState(WISH_DAILY);
  const [mineFilter, setMineFilter] = useState('all');
  const [compose, setCompose] = useState(false);
  const [text, setText] = useState('');
  const [wcat, setWcat] = useState('');
  const [pub, setPub] = useState(true);
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const [launch, setLaunch] = useState(null); // 방금 띄운 소원 (하늘로 올라가는 연출)
  const panel = useRef(null);
  // 행운의 부적에서 '소원으로도 띄워 볼까요?' → /wish?write=1&cat=종류: 로그인 확인이 끝나면 작성 창을 그 종류로 바로 엶 (2026-11-14)
  const [params, setParams] = useSearchParams();
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current || !params.get('write') || !auth?.ready || (auth.user && mine === null)) return; // 회원이면 오늘 남은 수를 받은 뒤
    asked.current = true;
    const c = wishCat(params.get('cat'))?.id || '';
    setParams({}, { replace: true });
    if (!auth.user) {
      openLogin('부적에 담은 마음을 소원으로 띄우려면 로그인해 주세요.');
      return;
    }
    if (left <= 0) {
      notify(`소원은 하루에 ${WISH_DAILY}개까지 빌 수 있어요. 내일 다시 띄워 주세요.`);
      return;
    }
    setWcat(c);
    setErr('');
    setCompose(true);
    trackEvent('wish_compose', { from: 'talisman' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.ready, auth?.user, mine]);

  const loadFeed = useCallback(async () => {
    const q = new URLSearchParams({ sort, ...(cat ? { cat } : {}) });
    const r = await api(`/api/wish?${q}`);
    if (r.ok) {
      setFeed(r.data.wishes || []);
      setStats(r.data.stats || { total: 0, today: 0 });
      setTop(r.data.top || []);
      setWeek(r.data.week || null);
    } else setFeed([]);
  }, [sort, cat]);
  const loadMine = useCallback(async () => {
    if (!member) return setMine(null);
    const r = await api('/api/wish?mine=1');
    if (r.ok) {
      setMine(r.data.wishes || []);
      setLeft(r.data.left ?? WISH_DAILY);
      setStats(r.data.stats || stats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);
  useEffect(() => {
    loadFeed();
  }, [loadFeed]);
  useEffect(() => {
    if (top.length) trackEvent('ranking_view', { place: 'wish_top' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top.length > 0]);
  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const openCompose = () => {
    if (!member) {
      trackEvent('wish_login');
      openLogin('소원은 천둥도사가 회원의 것만 하늘에 띄워 드려요. 로그인해 주세요.');
      return;
    }
    if (left <= 0) {
      notify(`소원은 하루에 ${WISH_DAILY}개까지 빌 수 있어요. 내일 다시 띄워 주세요.`);
      return;
    }
    setErr('');
    setCompose(true);
    trackEvent('wish_compose');
  };
  useEffect(() => {
    if (!compose) return undefined;
    setTimeout(() => panel.current?.querySelector('textarea')?.focus(), 50);
    const onKey = (e) => e.key === 'Escape' && setCompose(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [compose]);

  const submit = async (e) => {
    e.preventDefault();
    const t = text.trim();
    const bad = wishProblem(t); // 종류 고르기는 사용자 지시로 뺌 — 부적에서 넘어오면 그 종류, 아니면 기타
    if (bad) return setErr(bad);
    setSending(true);
    const r = await api('/api/wish', { method: 'POST', body: JSON.stringify({ text: t, cat: wcat || 'etc', pub }) });
    setSending(false);
    if (!r.ok) return setErr(r.data.error || '소원을 띄우지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    trackEvent('wish_post', { cat: wcat || 'etc', pub: pub ? 'yes' : 'no' });
    setCompose(false);
    setLaunch(r.data.wish);
    setText('');
    setWcat('');
    setPub(true);
    loadFeed();
    loadMine();
  };

  const cheer = async (w) => {
    if (!member) return openLogin('소원을 응원하려면 로그인해 주세요.');
    if (w.cheered) return;
    const r = await api('/api/wish/cheer', { method: 'POST', body: JSON.stringify({ id: w.id }) });
    if (!r.ok) return notify(r.data.error || '응원하지 못했어요.', 'negative');
    trackEvent('wish_cheer');
    setFeed((f) => f.map((x) => (x.id === w.id ? { ...x, cheered: true, cheers: r.data.cheers } : x)));
    setTop((f) => f.map((x) => (x.id === w.id ? { ...x, cheered: true, cheers: r.data.cheers } : x)));
    setMine((m) => (m ? m.map((x) => (x.id === w.id ? { ...x, cheered: true, cheers: r.data.cheers } : x)) : m));
  };
  const report = async (w) => {
    if (!window.confirm('이 소원을 신고할까요? 신고가 쌓이면 하늘에서 내려가요.')) return;
    const r = await api('/api/wish/report', { method: 'POST', body: JSON.stringify({ id: w.id }) });
    notify(r.ok ? '신고했어요. 살펴볼게요.' : r.data.error || '신고하지 못했어요.', r.ok ? 'positive' : 'negative');
  };
  const toggleDone = async (w) => {
    const r = await api('/api/wish/done', { method: 'POST', body: JSON.stringify({ id: w.id, done: !w.done }) });
    if (!r.ok) return notify(r.data.error || '바꾸지 못했어요.', 'negative');
    if (r.data.done) {
      trackEvent('wish_done');
      notify('축하해요! 소원이 이루어졌어요.', 'positive');
    }
    setMine((m) => m.map((x) => (x.id === w.id ? { ...x, done: r.data.done, doneAt: r.data.doneAt } : x)));
    loadFeed();
  };
  const remove = async (w) => {
    if (!window.confirm('이 소원을 지울까요? 지우면 되돌릴 수 없어요.')) return;
    const r = await api(`/api/wish?id=${w.id}`, { method: 'DELETE' });
    if (!r.ok) return notify(r.data.error || '지우지 못했어요.', 'negative');
    setMine((m) => m.filter((x) => x.id !== w.id));
    loadFeed();
  };

  const floating = (feed || []).slice(0, 6); // 화면 위쪽 하늘 띠에 둥둥 (휴대폰은 4개)
  const mineList = (mine || []).filter((w) => (mineFilter === 'all' ? true : mineFilter === 'done' ? w.done : !w.done));
  const doneCount = (mine || []).filter((w) => w.done).length;

  return (
    <article className="wish">
      <section className="wish-hero">
        <div className="wish-sky" aria-hidden="true">
          <span className="wish-moon" />
          {floating.map((w, i) => (
            <span key={w.id} className={`wish-float f${i}`}>
              {w.text.length > 18 ? `${w.text.slice(0, 18)}…` : w.text}
            </span>
          ))}
          {floating.length === 0 && [0, 1, 2, 3].map((i) => <span key={i} className={`wish-lantern l${i}`} />)}
        </div>
        <div className="wish-stage">
          <Suspense fallback={<span className="nm-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: dosaArtSvg('wish') }} />}>
            <Mascot3D prop="stars" mode={launch ? 'drawing' : 'idle'} />
          </Suspense>
        </div>
        <div className="wish-hero-text">
          <p className="nm-kicker">소원빌기</p>
          <h1 className="wish-title">오늘 당신의 소원은 무엇인가요?</h1>
          <p className="wish-lead">마음속에 담아 두었던 작은 바람을 하늘에 띄워 보세요. 다른 사람들의 작은 바람도 함께 만날 수 있어요.</p>
          <dl className="wish-stats">
            <div>
              <dt>하늘에 뜬 소원</dt>
              <dd>{stats.total.toLocaleString('ko-KR')}</dd>
            </div>
            <div>
              <dt>오늘 빈 소원</dt>
              <dd>{stats.today.toLocaleString('ko-KR')}</dd>
            </div>
          </dl>
          <LiquidMetalButton label="내 소원 띄우기" width={200} onClick={openCompose} />
        </div>
      </section>

      <nav className="day-tabs wish-tabs" role="tablist" aria-label="소원빌기">
        <button type="button" role="tab" aria-selected={tab === 'feed'} className={tab === 'feed' ? 'on' : ''} onClick={() => setTab('feed')}>
          소원 구경하기
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'mine'}
          className={tab === 'mine' ? 'on' : ''}
          onClick={() => (member ? setTab('mine') : openLogin('내 소원 보관함은 로그인하면 볼 수 있어요.'))}
        >
          내 소원 보관함
        </button>
      </nav>

      {tab === 'feed' && top.length > 0 && (
        <section className="wish-top" aria-labelledby="wish-top-title">
          <div className="wish-top-head">
            <h2 id="wish-top-title">이번 주 가장 많이 응원받은 소원</h2>
            {week && (
              <span>
                {week.start.slice(5).replace('-', '.')} – {week.end.slice(5).replace('-', '.')}
              </span>
            )}
          </div>
          <ol className="wish-top-list">
            {top.map((w, i) => (
              <li key={w.id} className={openTop === w.id ? 'is-open' : ''}>
                <button type="button" className="wish-top-row" onClick={() => setOpenTop(openTop === w.id ? null : w.id)} aria-expanded={openTop === w.id}>
                  <span className="wish-top-rank">{i + 1}</span>
                  <span className="wish-top-text">“{w.text}”</span>
                  <span className="wish-top-n">응원 {w.cheers}</span>
                </button>
                {openTop === w.id && (
                  <div className="wish-top-act">
                    <button type="button" className={`wish-cheer${w.cheered ? ' on' : ''}`} onClick={() => cheer(w)} aria-pressed={!!w.cheered}>
                      {w.cheered ? '응원했어요' : '소원 응원하기'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {tab === 'feed' && (
        <section className="wish-feed">
          <div className="wish-filters">
            {/* 종류 칩 (위) + 소원 수·정렬 토글 (아래, 작게) — 위 탭과 같은 모양이 겹치지 않게 (2026-11-14 사용자 지시) */}
            <div className="wish-cats" role="group" aria-label="종류">
              <button type="button" className={!cat ? 'on' : ''} aria-pressed={!cat} onClick={() => setCat('')}>
                전체
              </button>
              {WISH_CATS.map((c) => (
                <button key={c.id} type="button" className={cat === c.id ? 'on' : ''} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="wish-listbar">
              <span>{feed ? `소원 ${feed.length.toLocaleString('ko-KR')}개` : ''}</span>
              <div className="wish-sort" role="group" aria-label="정렬">
                {[
                  ['new', '최신순'],
                  ['hot', '인기순'],
                ].map(([k, l]) => (
                  <button key={k} type="button" className={sort === k ? 'on' : ''} aria-pressed={sort === k} onClick={() => setSort(k)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {feed === null ? (
            <p className="hint center">하늘을 올려다보는 중이에요…</p>
          ) : feed.length === 0 ? (
            <div className="wish-empty">
              <p>
                아직 하늘에 뜬 소원이 없어요.
                <br />첫 소원을 띄워 보세요.
              </p>
            </div>
          ) : (
            <ul className="wish-list">
              {feed.map((w) => (
                <WishCard key={w.id} w={w} member={member} onCheer={cheer} onReport={report} />
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'mine' && member && (
        <section className="wish-mine">
          <ul className="wish-mine-stats">
            <li>
              <b>{(mine || []).length}</b>
              <span>전체 소원</span>
            </li>
            <li>
              <b>{doneCount}</b>
              <span>이루어진 소원</span>
            </li>
            <li>
              <b>{(mine || []).length - doneCount}</b>
              <span>진행 중</span>
            </li>
          </ul>
          <div className="wish-cats" role="group" aria-label="내 소원 거르기">
            {[
              ['all', '전체'],
              ['ing', '진행 중'],
              ['done', '이루어진 소원'],
            ].map(([k, l]) => (
              <button key={k} type="button" className={mineFilter === k ? 'on' : ''} aria-pressed={mineFilter === k} onClick={() => setMineFilter(k)}>
                {l}
              </button>
            ))}
          </div>
          {mine === null ? (
            <p className="hint center">보관함을 여는 중이에요…</p>
          ) : mineList.length === 0 ? (
            <div className="wish-empty">
              <p>{mineFilter === 'done' ? '아직 이루어진 소원이 없어요.' : '아직 띄운 소원이 없어요.'}</p>
              <p>{mineFilter === 'done' ? '꼭 이루어지길 응원해요.' : '첫 소원을 하늘에 띄워 보세요.'}</p>
            </div>
          ) : (
            <ul className="wish-mine-list">
              {mineList.map((w) => {
                const old = !w.done && Date.now() - Date.parse(w.createdAt) > 30 * 86400e3;
                return (
                  <li key={w.id} className={`wish-row is-mine${w.done ? ' is-done' : ''}`}>
                    <p className={`wish-row-state${w.done ? ' is-done' : ''}`}>
                      {w.done ? '이루어진 소원' : '진행 중'}
                      {w.weekRank && <span> · 이번 주 {w.weekRank}위</span>}
                      {!w.pub && <span> · 나만 보기</span>}
                      {w.hidden && <span> · 신고로 숨겨짐</span>}
                    </p>
                    <p className="wish-row-text">{w.text}</p>
                    <div className="wish-row-foot">
                      <span className="wish-row-meta">
                        {wishCat(w.cat)?.label} · {ymd(w.createdAt)}
                        {w.done && w.doneAt ? ` · ${ymd(w.doneAt)} 이루어짐` : ''}
                      </span>
                      <button type="button" className={`wish-row-cheer${w.cheered ? ' on' : ''}`} onClick={() => cheer(w)} aria-pressed={!!w.cheered} disabled={!!w.cheered || w.hidden}>
                        {w.cheered ? '응원했어요' : '응원하기'} <b>{w.cheers}</b>
                      </button>
                    </div>
                    {old && <p className="wish-remind">소원을 빈 지 30일이 지났어요. 다시 마음에 새겨 보세요.</p>}
                    <div className="wish-row-actions">
                      <button type="button" className={w.done ? '' : 'is-main'} onClick={() => toggleDone(w)}>
                        {w.done ? '다시 진행 중으로' : '소원이 이루어졌어요'}
                      </button>
                      <button type="button" onClick={() => navigate(`/talisman?k=${WISH_TO_TALISMAN[w.cat] || 'luck'}`)}>
                        어울리는 부적
                      </button>
                      <button type="button" className="is-del" onClick={() => remove(w)}>
                        지우기
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* 작성 창 (휴대폰에선 아래쪽 시트 — 모바일 모달 규칙 그대로) */}
      {compose && (
        <div className="contact-overlay" onMouseDown={(e) => e.target === e.currentTarget && setCompose(false)}>
          <form className="contact wish-compose" role="dialog" aria-modal="true" aria-labelledby="wish-compose-title" ref={panel} onSubmit={submit}>
            <div className="contact-head">
              <h2 id="wish-compose-title" className="contact-title">
                나의 소원 띄우기
              </h2>
              <button type="button" className="fortune__close" aria-label="닫기" onClick={() => setCompose(false)}>
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <label className="nm-label" htmlFor="wish-text">
              이루고 싶은 소원
            </label>
            <textarea
              id="wish-text"
              className="contact-input contact-textarea wish-textarea"
              rows={3}
              maxLength={WISH_MAX}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setErr('');
              }}
              placeholder="예: 올해는 꼭 원하는 회사에 취업하고 싶어요."
            />
            <p className="wish-count">
              실명·연락처 같은 개인정보는 적지 말아 주세요 <span>{text.trim().length}/{WISH_MAX}</span>
            </p>
            {/* 공개 범위: 담백한 두 칸 선택 + 한 줄 설명 (2026-11-14 사용자 지시) */}
            <p className="nm-label">공개 범위</p>
            <div className="wish-seg" role="radiogroup" aria-label="공개 범위">
              <button type="button" role="radio" aria-checked={pub} className={pub ? 'on' : ''} onClick={() => setPub(true)}>
                전체 공개
              </button>
              <button type="button" role="radio" aria-checked={!pub} className={!pub ? 'on' : ''} onClick={() => setPub(false)}>
                나만 보기
              </button>
            </div>
            <p className="wish-seg-desc">{pub ? '다른 사람도 볼 수 있어요. 이름 없이 익명으로 보여요.' : '나만 볼 수 있어요. 다른 사람에게는 보이지 않아요.'}</p>
            {err && (
              <p className="nm-err" role="alert">
                {err}
              </p>
            )}
            <button type="submit" className="btn-primary wish-submit" disabled={sending || left <= 0}>
              {sending ? '띄우는 중…' : '하늘에 소원 띄우기'}
            </button>
          </form>
        </div>
      )}

      {/* 하늘로 올라가는 연출 */}
      {launch && (
        <div className="wish-launch" role="dialog" aria-modal="true" aria-labelledby="wish-launch-title">
          <div className="wish-launch-stars" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => (
              <i key={i} style={{ '--x': `${(i * 53) % 100}%`, '--d': `${(i % 6) * 0.18}s` }} />
            ))}
          </div>
          <div className="wish-launch-card" aria-hidden="true">
            <p>“{launch.text}”</p>
          </div>
          <div className="wish-launch-msg">
            <h2 id="wish-launch-title">당신의 소원이 하늘에 도착했어요</h2>
            <p>{launch.pub ? '다른 사람들도 당신의 소원을 응원할 수 있어요.' : '나만 보는 소원으로 고이 띄웠어요.'}</p>
            <div className="wish-launch-btns">
              {/* 2026-11-14 사용자 지시: 꽉 찬 금색 버튼 대신 얇은 테두리, 아래는 배경 없는 글자 링크 */}
              <button
                type="button"
                className="wish-launch-main"
                onClick={() => {
                  setLaunch(null);
                  setTab('feed');
                }}
              >
                다른 사람의 소원 구경하기
              </button>
              <button type="button" className="wish-launch-link" onClick={() => navigate(`/talisman?k=${WISH_TO_TALISMAN[launch.cat] || 'luck'}`)}>
                이 소원에 어울리는 부적 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
