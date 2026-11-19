// 일주 캐릭터 /iljoo (2026-11-19 사용자 지시 — 리텐션 기능 ①). AI 없이 src/lib/iljoo.js 고정 글.
// 내 일주: 마이페이지에 '내 사주 정보'가 있으면 바로, 없으면 생년월일로. 친구 일주도 보면 이 브라우저 도감(60칸)에 모임.
// ?d=갑자 로 들어오면 그 일주 카드(공유 링크). 'AI 티' 없이 — 상자 대신 얇은 줄·글자 계층, 오행 색은 카드 한 장에만.
import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { computeSaju } from '../lib/saju.js';
import { ILJOO_LIST, iljooInfo, toIljoo, loadBook, addToBook, STEM_INFO, BRANCH_INFO } from '../lib/iljoo.js';
import { zodiacSvg } from '../brand/zodiacArt.js';
import { ShareButtons } from '../components/ShareRow.jsx';
import { growAction } from '../lib/grow.js';
import { trackEvent } from '../lib/analytics.js';

const EL_KO = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
const thisYear = new Date().getFullYear();

// full: 마이페이지 '내 사주 정보'처럼 시각·지역까지 있으면 그대로(밤 11시 이후 출생도 정확), 아니면 날짜만
function iljooOf(input, full = false) {
  const c = computeSaju(full ? input : { ...input, timeKnown: false, gender: 'female', city: 'seoul' });
  return c.pillars.day.stem + c.pillars.day.branch;
}

function Card({ gz, mine }) {
  const info = iljooInfo(gz);
  return (
    <article className={`ij-card el-${info.el}`} aria-label={`${info.ko} 일주`}>
      <div className="ij-card-top">
        <span className="ij-hanja">{gz}</span>
        <span className="ij-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: zodiacSvg(info.animal, 'good') }} />
      </div>
      <p className="ij-kicker">
        {mine ? '나의 일주 · ' : ''}
        {info.ko} 일주 · {EL_KO[info.el]}
      </p>
      <h2 className="ij-nick">{info.nickname}</h2>
      <p className="ij-intro">{info.intro}</p>
      <dl className="ij-lines">
        <div>
          <dt>잘하는 것</dt>
          <dd>{info.good}</dd>
        </div>
        <div>
          <dt>조심할 것</dt>
          <dd>{info.care}</dd>
        </div>
        <div>
          <dt>잘 맞는 일주</dt>
          <dd className="ij-matches">
            {info.matches.map((m) => (
              <Link key={m} to={`/iljoo?d=${iljooInfo(m).ko}`}>
                {iljooInfo(m).ko}
              </Link>
            ))}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function BirthForm({ onDone, label }) {
  const [cal, setCal] = useState('solar');
  const [d, setD] = useState({ y: '', m: '', day: '' });
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    try {
      onDone(iljooOf({ calendar: cal, year: d.y, month: d.m, day: d.day }));
      setErr('');
    } catch (x) {
      setErr(x?.message || '날짜를 다시 확인해 주세요.');
    }
  };
  const num = (k, max) => (e) => setD((o) => ({ ...o, [k]: e.target.value.replace(/[^0-9]/g, '').slice(0, max) }));
  return (
    <form className="ij-form" onSubmit={submit}>
      <div className="ij-seg" role="radiogroup" aria-label="양력·음력">
        {[
          ['solar', '양력'],
          ['lunar', '음력'],
        ].map(([v, t]) => (
          <button key={v} type="button" role="radio" aria-checked={cal === v} className={cal === v ? 'on' : ''} onClick={() => setCal(v)}>
            {t}
          </button>
        ))}
      </div>
      <div className="ij-date">
        <input className="contact-input" inputMode="numeric" placeholder={`${thisYear - 30}`} value={d.y} onChange={num('y', 4)} aria-label="태어난 해" />
        <span>년</span>
        <input className="contact-input" inputMode="numeric" placeholder="1" value={d.m} onChange={num('m', 2)} aria-label="태어난 달" />
        <span>월</span>
        <input className="contact-input" inputMode="numeric" placeholder="1" value={d.day} onChange={num('day', 2)} aria-label="태어난 날" />
        <span>일</span>
      </div>
      {err && <p className="field-msg">{err}</p>}
      <button type="submit" className="btn-primary" disabled={!d.y || !d.m || !d.day}>
        {label}
      </button>
      <p className="ij-note">일주는 태어난 날로 정해져요. 밤 11시 이후에 태어났다면 다음 날 일주일 수 있어요.</p>
    </form>
  );
}

export default function Iljoo() {
  const { auth, notify } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [book, setBook] = useState(loadBook);
  const [friendOpen, setFriendOpen] = useState(false);
  const shared = toIljoo(params.get('d'));

  // 회원의 '내 사주 정보'로 내 일주
  const accountIljoo = useMemo(() => {
    try {
      return auth.user?.birth ? iljooOf(auth.user.birth, true) : null;
    } catch {
      return null;
    }
  }, [auth.user?.birth]);
  useEffect(() => {
    if (accountIljoo && book.mine !== accountIljoo) setBook(addToBook(accountIljoo, { mine: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIljoo]);
  useEffect(() => {
    if (shared) {
      setBook(addToBook(shared));
      trackEvent('iljoo_view', { from: 'link' });
    }
  }, [shared]);
  const mine = accountIljoo || book.mine;
  const shown = shared || mine;
  useEffect(() => {
    if (shown && auth.user) growAction('iljoo');
  }, [shown, auth.user]);

  const setMine = (gz) => {
    setBook(addToBook(gz, { mine: true }));
    setParams({}, { replace: true });
    trackEvent('iljoo_view', { from: 'mine' });
  };
  const addFriend = (gz) => {
    setBook(addToBook(gz));
    setFriendOpen(false);
    setParams({ d: iljooInfo(gz).ko });
    trackEvent('iljoo_view', { from: 'friend' });
  };
  const info = shown ? iljooInfo(shown) : null;

  return (
    <section className="ij">
      <p className="ij-eyebrow">일주 캐릭터</p>
      <h1 className="start-title">나는 어떤 천동이일까요?</h1>
      <p className="start-lead">태어난 날의 기둥(일주)은 60가지예요. 내 일주와 친구 일주를 모아 보세요.</p>

      {shown ? (
        <>
          <Card gz={shown} mine={shown === mine && !shared} />
          {shared && shared !== mine && (
            <p className="ij-sub">
              {mine ? (
                <button type="button" className="ij-link" onClick={() => setParams({}, { replace: true })}>
                  내 일주({iljooInfo(mine).ko}) 다시 보기
                </button>
              ) : (
                '아래에서 내 일주도 확인해 보세요.'
              )}
            </p>
          )}
          <ShareButtons kakao={{ title: `나는 '${info.nickname}' ${info.ko} 일주예요`, description: info.intro, button: '내 일주 보기' }} path={`/iljoo?d=${info.ko}`} onNotice={notify} event="iljoo_share" label="일주 카드 공유하기" />
        </>
      ) : null}

      {!mine && (
        <div className="ij-block">
          <h2 className="ij-h2">내 일주 찾기</h2>
          <BirthForm onDone={setMine} label="내 일주 보기" />
        </div>
      )}

      <div className="ij-block">
        <div className="ij-row">
          <h2 className="ij-h2">일주 도감</h2>
          <span className="ij-count">
            {book.seen.length} / 60
          </span>
        </div>
        <ul className="ij-grid" aria-label="60일주 도감">
          {ILJOO_LIST.map((gz) => {
            const got = book.seen.includes(gz);
            return (
              <li key={gz}>
                {got ? (
                  <Link to={`/iljoo?d=${iljooInfo(gz).ko}`} className={`el-${STEM_INFO[gz[0]].el}${gz === mine ? ' is-mine' : ''}${gz === shown ? ' is-on' : ''}`} aria-label={`${iljooInfo(gz).ko} 일주`}>
                    {gz}
                  </Link>
                ) : (
                  <span aria-label="아직 못 본 일주">
                    {STEM_INFO[gz[0]].ko}
                    {BRANCH_INFO[gz[1]].ko}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {friendOpen ? (
          <div className="ij-friend">
            <h3 className="ij-h3">친구 일주 보기</h3>
            <BirthForm onDone={addFriend} label="친구 일주 보기" />
          </div>
        ) : (
          <button type="button" className="ij-link" onClick={() => setFriendOpen(true)}>
            친구·가족 생일로 일주 모으기
          </button>
        )}
        <p className="ij-note">
          흔히 쓰는 일주 해석을 쉬운 말로 줄인 거예요. 사람을 하나로 단정하지는 않아요. 내 사주 전체는 <Link to="/start">무료 사주</Link>에서 볼 수 있어요.
        </p>
      </div>
    </section>
  );
}
