// 행운의 번호 (/lucky, 2026-11-14 사용자 요청)
// 처음엔 네잎클로버를 든 천둥도사가 크게 둥둥 떠 있음 → 누르면 번호 공들이 천둥도사 둘레를 돌며 고르는 연출 → 번호 6개.
// 회원만 하루 1번 (비회원은 누르면 로그인 창 — 2026-11-14 사용자 지시): 서버(/api/lucky, Netlify Blobs 'lucky')가 회원번호로 오늘 뽑은 번호를 기억하고,
// 다시 누르면 같은 번호와 함께 '하루 1회만' 안내. 번호는 서버가 뽑아 저장함.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { dosaFaceSvg } from '../brand/dosaArt.js';
import ResultShare from '../components/ShareRow.jsx';
import { trackEvent } from '../lib/analytics.js';

// 3D 천동이 (메인과 같은 모델 + 네잎클로버·로또 공, 2026-11-14 사용자 요청). 불러오는 동안·WebGL 이 없으면 2D 그림
const Mascot3D = lazy(() => import('../components/Mascot3D.jsx'));

const SPIN_MS = 2800; // 고르는 연출 최소 시간
const ballColor = (n) => (n <= 10 ? '#fbc400' : n <= 20 ? '#69c8f2' : n <= 30 ? '#ff7272' : n <= 40 ? '#aab0b6' : '#b0d840');
const ART = {
  idle: dosaFaceSvg({ eyes: 'happy', mouth: 'smile' }, 'clover'),
  drawing: dosaFaceSvg({ eyes: 'closed', mouth: 'o', brows: 'soft' }, 'clover'),
  done: dosaFaceSvg({ eyes: 'star', mouth: 'open', brows: 'raise' }, 'clover'),
};
const DRAW_LINES = ['오늘의 기운을 모으는 중이에요…', '번호 공들이 천둥도사 둘레를 돌고 있어요…', '행운이 깃든 번호를 고르는 중이에요…'];
const dateText = (ymd) => {
  const [, m, d] = String(ymd || '').split('-').map(Number);
  return m && d ? `${m}월 ${d}일` : '오늘';
};

function Ball({ n, delay = 0, size = 'lg' }) {
  return (
    <span className={`lotto-ball is-${size}`} style={{ '--c': ballColor(n), animationDelay: `${delay}ms` }}>
      {n}
    </span>
  );
}

export default function Lucky() {
  const { auth, openLogin, notify } = useOutletContext();
  const member = !!auth?.user;
  const [phase, setPhase] = useState('loading'); // loading | idle | drawing | done
  const [numbers, setNumbers] = useState(null);
  const [date, setDate] = useState('');
  const [fresh, setFresh] = useState(false); // 방금 뽑아서 공이 하나씩 떨어지는 중
  const [line, setLine] = useState(0);
  const busy = useRef(false);

  // 들어오면 (회원이면) 오늘 이미 뽑았는지 확인. 로그인하면 다시 확인
  useEffect(() => {
    let alive = true;
    if (!member) {
      setNumbers(null);
      setPhase('idle');
      return undefined;
    }
    setPhase('loading');
    fetch('/api/lucky', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        if (d?.date) setDate(d.date);
        if (Array.isArray(d?.numbers)) {
          setNumbers(d.numbers);
          setPhase('done');
        } else setPhase('idle');
      })
      .catch(() => alive && setPhase('idle'));
    return () => {
      alive = false;
    };
  }, [member]);

  useEffect(() => {
    if (phase !== 'drawing') return undefined;
    const iv = setInterval(() => setLine((l) => (l + 1) % DRAW_LINES.length), 1100);
    return () => clearInterval(iv);
  }, [phase]);


  const draw = async () => {
    if (busy.current || phase === 'loading' || phase === 'drawing') return;
    if (phase === 'done') {
      trackEvent('lucky_repeat');
      notify('행운의 번호는 하루 1회만 뽑을 수 있어요. 내일 다시 뽑아 보세요.');
      return;
    }
    if (!member) {
      trackEvent('lucky_login');
      openLogin('행운의 번호는 천둥도사가 회원에게만 하루 한 번 뽑아 드려요. 로그인해 주세요.');
      return;
    }
    busy.current = true;
    setPhase('drawing');
    setLine(0);
    const started = Date.now();
    const res = await fetch('/api/lucky', { method: 'POST' }).catch(() => null);
    const d = await res?.json().catch(() => null);
    await new Promise((r) => setTimeout(r, Math.max(0, SPIN_MS - (Date.now() - started))));
    busy.current = false;
    if (!res?.ok || !Array.isArray(d?.numbers)) {
      setPhase('idle');
      if (d?.login) return openLogin('로그인이 풀렸어요. 다시 로그인하면 행운의 번호를 뽑을 수 있어요.');
      notify(d?.error || '번호를 뽑지 못했어요. 잠시 뒤 다시 시도해 주세요.', 'negative');
      return;
    }
    setDate(d.date);
    setNumbers(d.numbers);
    setFresh(!d.already);
    setPhase('done');
    trackEvent('lucky_draw', { already: d.already ? 'yes' : 'no' });
    if (d.already) notify('오늘은 이미 뽑았어요. 행운의 번호는 하루 1회만 뽑을 수 있어요.');
  };

  const art = phase === 'drawing' ? ART.drawing : phase === 'done' ? ART.done : ART.idle;

  return (
    <section className="lucky-page">
      <h1 className="start-title">행운의 번호</h1>
      <p className="start-lead">천둥도사를 누르면 오늘의 행운 번호 여섯 개를 뽑아 드려요. 하루에 한 번만 뽑을 수 있어요.</p>

      <div className={`lucky-stage is-${phase}`}>
        <button type="button" className="lucky-dosa" onClick={draw} aria-label={phase === 'done' ? '오늘의 행운 번호 다시 보기' : '천둥도사를 눌러 행운의 번호 뽑기'} disabled={phase === 'loading'}>
          <Suspense fallback={<span className="lucky-dosa-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art }} />}>
            <Mascot3D prop="clover" mode={phase === 'drawing' ? 'drawing' : phase === 'done' ? 'done' : 'idle'} />
          </Suspense>
        </button>
      </div>

      <div className="lucky-panel" aria-live="polite">
        {phase === 'idle' && (
          <>
            <p className="lucky-hint">{member ? '천둥도사를 눌러 보세요' : '로그인하면 천둥도사가 하루 한 번 행운의 번호를 뽑아 드려요'}</p>
            <button type="button" className="btn-primary inline" onClick={draw}>
              {member ? '행운의 번호 뽑기' : '로그인하고 번호 뽑기'}
            </button>
          </>
        )}
        {phase === 'drawing' && <p className="lucky-hint is-busy">{DRAW_LINES[line]}</p>}
        {phase === 'done' && numbers && (
          <>
            <p className="lucky-kicker">{dateText(date)} 천둥도사가 뽑은 행운의 번호</p>
            <div className="lucky-balls" role="list" aria-label={`행운의 번호 ${numbers.join(', ')}`}>
              {numbers.map((n, i) => (
                <span role="listitem" key={n}>
                  <Ball n={n} delay={fresh ? 200 + i * 260 : 0} />
                </span>
              ))}
            </div>
            <p className="lucky-once">행운의 번호는 하루 1회만 뽑을 수 있어요. 내일 다시 만나요!</p>
            <p className="lucky-note">재미로 보는 번호예요. 당첨을 약속하지는 않아요.</p>
          </>
        )}
      </div>

      {phase === 'done' && numbers && (
        <ResultShare
          title="오늘의 행운 번호를 나눠 보세요"
          path="/lucky"
          kakao={{ title: '천둥도사가 뽑아 준 오늘의 행운 번호', description: `오늘의 번호 ${numbers.join(' · ')} — 나도 뽑아 볼까요?`, button: '나도 뽑기' }}
        />
      )}
    </section>
  );
}
