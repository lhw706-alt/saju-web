// 소원빌기 (/wish, 2026-11-14 사용자 기획안) — 로그인한 사람이 소원을 하늘에 띄우고, 다른 사람의 소원을 구경·응원하는 참여형 콘텐츠.
// 화면: 밤하늘(떠다니는 최근 소원) + 현황 → [내 소원 띄우기] → 작성 창(100자·종류·공개 범위) → 하늘로 올라가는 연출
//      → 소원 구경하기(최신·인기·종류, 응원·신고) · 내 소원 보관함(전체·이루어진·진행 중, 이루어졌어요·삭제, 30일 다시 보기 안내).
// 서버 /api/wish*(netlify/functions/auth.mjs), 규칙 src/lib/wish.js. 다른 사람에게는 익명으로만 보임. 이모지 대신 글래스 아이콘.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { WISH_CATS, WISH_MAX, WISH_DAILY, wishCat, wishProblem } from '../lib/wish.js';
import GlassIcon, { LineIcon } from '../components/GlassIcon.jsx';
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
    <li className={`wish-card${w.done ? ' is-done' : ''}`}>
      <div className="wish-card-top">
        <span className="wish-cat">
          <LineIcon kind={w.cat === 'etc' ? 'luck' : w.cat} size={15} />
          {c?.label}
        </span>
        {w.done && <span className="wish-done-tag">이루어졌어요</span>}
        <span className="wish-time">{ago(w.createdAt)}</span>
      </div>
      <p className="wish-text">“{w.text}”</p>
      <div className="wish-card-foot">
        <span className="wish-anon">{w.mine ? '나의 소원' : '익명의 소원'}</span>
        {!w.mine && (
          <button type="button" className={`wish-cheer${w.cheered ? ' on' : ''}`} onClick={() => onCheer(w)} aria-pressed={!!w.cheered}>
            <LineIcon kind="luck" size={15} />
            {w.cheered ? '응원했어요' : '소원 응원하기'} <b>{w.cheers}</b>
          </button>
        )}
        {w.mine && (
          <span className="wish-cheer is-static">
            <LineIcon kind="luck" size={15} /> 응원 <b>{w.cheers}</b>
          </span>
        )}
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

  const loadFeed = useCallback(async () => {
    const q = new URLSearchParams({ sort, ...(cat ? { cat } : {}) });
    const r = await api(`/api/wish?${q}`);
    if (r.ok) {
      setFeed(r.data.wishes || []);
      setStats(r.data.stats || { total: 0, today: 0 });
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
    loadMine();
  }, [loadMine]);

  const openCompose = () => {
    if (!member) {
      trackEvent('wish_login');
      openLogin('소원은 천둥도사가 회원의 것만 하늘에 띄워 드려요. 로그인해 주세요.');
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
    const bad = wishProblem(t) || (!wcat ? '소원의 종류를 골라 주세요.' : null);
    if (bad) return setErr(bad);
    setSending(true);
    const r = await api('/api/wish', { method: 'POST', body: JSON.stringify({ text: t, cat: wcat, pub }) });
    setSending(false);
    if (!r.ok) return setErr(r.data.error || '소원을 띄우지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    trackEvent('wish_post', { cat: wcat, pub: pub ? 'yes' : 'no' });
    setCompose(false);
    setLaunch(r.data.wish);
    setText('');
    setWcat('');
    setPub(true);
    loadFeed();
    loadMine();
  };

  const cheer = async (w) => {
    if (!member) return openLogin('다른 사람의 소원을 응원하려면 로그인해 주세요.');
    if (w.cheered) return;
    const r = await api('/api/wish/cheer', { method: 'POST', body: JSON.stringify({ id: w.id }) });
    if (!r.ok) return notify(r.data.error || '응원하지 못했어요.', 'negative');
    trackEvent('wish_cheer');
    setFeed((f) => f.map((x) => (x.id === w.id ? { ...x, cheered: true, cheers: r.data.cheers } : x)));
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

  const floating = (feed || []).slice(0, 4); // 천동이 양옆에만
  const mineList = (mine || []).filter((w) => (mineFilter === 'all' ? true : mineFilter === 'done' ? w.done : !w.done));
  const doneCount = (mine || []).filter((w) => w.done).length;

  return (
    <article className="wish">
      <section className="wish-hero">
        <div className="wish-sky" aria-hidden="true">
          <span className="wish-moon" />
          {floating.map((w, i) => (
            <span key={w.id} className={`wish-float f${i}`}>
              <LineIcon kind={w.cat === 'etc' ? 'luck' : w.cat} size={13} />
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
          <ul className="wish-stats">
            <li>
              <b>{stats.total.toLocaleString('ko-KR')}</b>
              <span>하늘에 뜬 소원</span>
            </li>
            <li>
              <b>{stats.today.toLocaleString('ko-KR')}</b>
              <span>오늘 빈 소원</span>
            </li>
          </ul>
          <LiquidMetalButton label="내 소원 띄우기" width={200} onClick={openCompose} />
          {member && <p className="wish-left">오늘 {left}개 더 빌 수 있어요</p>}
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

      {tab === 'feed' && (
        <section className="wish-feed">
          <div className="wish-filters">
            <div className="wish-sort" role="group" aria-label="정렬">
              {[
                ['new', '최신 소원'],
                ['hot', '인기 소원'],
              ].map(([k, l]) => (
                <button key={k} type="button" className={sort === k ? 'on' : ''} aria-pressed={sort === k} onClick={() => setSort(k)}>
                  {l}
                </button>
              ))}
            </div>
            <div className="wish-cats" role="group" aria-label="종류">
              <button type="button" className={!cat ? 'on' : ''} aria-pressed={!cat} onClick={() => setCat('')}>
                전체
              </button>
              {WISH_CATS.map((c) => (
                <button key={c.id} type="button" className={cat === c.id ? 'on' : ''} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
                  <LineIcon kind={c.id === 'etc' ? 'luck' : c.id} size={14} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {feed === null ? (
            <p className="hint center">하늘을 올려다보는 중이에요…</p>
          ) : feed.length === 0 ? (
            <div className="wish-empty">
              <GlassIcon kind="sky" />
              <p>아직 하늘에 뜬 소원이 없어요. 첫 소원을 띄워 보세요.</p>
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
              <GlassIcon kind="box" size="sm" />
              <b>{(mine || []).length}</b>
              <span>전체 소원</span>
            </li>
            <li>
              <GlassIcon kind="done" size="sm" />
              <b>{doneCount}</b>
              <span>이루어진 소원</span>
            </li>
            <li>
              <GlassIcon kind="luck" size="sm" />
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
              <GlassIcon kind="box" />
              <p>{mineFilter === 'done' ? '아직 이루어진 소원이 없어요. 꼭 이루어지길 응원해요.' : '아직 띄운 소원이 없어요.'}</p>
            </div>
          ) : (
            <ul className="wish-mine-list">
              {mineList.map((w) => {
                const old = !w.done && Date.now() - Date.parse(w.createdAt) > 30 * 86400e3;
                return (
                  <li key={w.id} className={`wish-mine-item card${w.done ? ' is-done' : ''}`}>
                    <div className="wish-card-top">
                      <span className="wish-cat">
                        <LineIcon kind={w.cat === 'etc' ? 'luck' : w.cat} size={15} />
                        {wishCat(w.cat)?.label}
                      </span>
                      <span className={`wish-state${w.done ? ' is-done' : ''}`}>{w.done ? '이루어졌어요' : '진행 중'}</span>
                      {!w.pub && <span className="wish-private">나만 보기</span>}
                      {w.hidden && <span className="wish-private">신고로 숨겨짐</span>}
                    </div>
                    <p className="wish-text">“{w.text}”</p>
                    <p className="wish-meta">
                      {ymd(w.createdAt)} 등록{w.done && w.doneAt ? ` · ${ymd(w.doneAt)} 이루어짐` : ''} · 응원 {w.cheers}
                    </p>
                    {old && <p className="wish-remind">소원을 빈 지 30일이 지났어요. 다시 마음에 새겨 보세요.</p>}
                    <div className="wish-mine-actions">
                      <button type="button" className={w.done ? 'btn-ghost' : 'btn-primary inline'} onClick={() => toggleDone(w)}>
                        {w.done ? '다시 진행 중으로' : '소원이 이루어졌어요'}
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => navigate(`/talisman?k=${WISH_TO_TALISMAN[w.cat] || 'luck'}`)}>
                        어울리는 부적 보기
                      </button>
                      <button type="button" className="wish-del" onClick={() => remove(w)}>
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
            <p className="nm-label">어떤 소원인가요?</p>
            <div className="nm-rels wish-cat-pick" role="radiogroup" aria-label="소원 종류">
              {WISH_CATS.map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={wcat === c.id} className={wcat === c.id ? 'on' : ''} onClick={() => setWcat(c.id)}>
                  <GlassIcon kind={c.id === 'etc' ? 'luck' : c.id} size="sm" />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
            <p className="nm-label">소원 공개 설정</p>
            <div className="wish-vis" role="radiogroup" aria-label="공개 설정">
              <button type="button" role="radio" aria-checked={pub} className={pub ? 'on' : ''} onClick={() => setPub(true)}>
                <b>전체 공개</b>
                <span>다른 사람도 내 소원을 볼 수 있어요 (이름 없이 익명으로)</span>
              </button>
              <button type="button" role="radio" aria-checked={!pub} className={!pub ? 'on' : ''} onClick={() => setPub(false)}>
                <b>나만 보기</b>
                <span>다른 사람에게 공개되지 않아요</span>
              </button>
            </div>
            {err && (
              <p className="nm-err" role="alert">
                {err}
              </p>
            )}
            <div className="nm-submit">
              <LiquidMetalButton type="submit" label={sending ? '띄우는 중…' : '하늘에 소원 띄우기'} width={220} disabled={sending || left <= 0} />
            </div>
            <p className="wish-left">{left > 0 ? `오늘 ${left}개 더 빌 수 있어요` : `소원은 하루에 ${WISH_DAILY}개까지 빌 수 있어요. 내일 다시 띄워 주세요.`}</p>
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
            <span className="wish-cat">
              <LineIcon kind={launch.cat === 'etc' ? 'luck' : launch.cat} size={15} />
              {wishCat(launch.cat)?.label}
            </span>
            <p>“{launch.text}”</p>
          </div>
          <div className="wish-launch-msg">
            <h2 id="wish-launch-title">당신의 소원이 하늘에 도착했어요</h2>
            <p>{launch.pub ? '다른 사람들도 당신의 소원을 응원할 수 있어요.' : '나만 보는 소원으로 고이 띄웠어요.'}</p>
            <div className="wish-launch-btns">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setLaunch(null);
                  setTab('feed');
                }}
              >
                다른 사람의 소원 구경하기
              </button>
              <button type="button" className="btn-ghost" onClick={() => navigate(`/talisman?k=${WISH_TO_TALISMAN[launch.cat] || 'luck'}`)}>
                이 소원에 어울리는 부적 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
