// 오늘의 운세 투표 카드 (2026-11-14) — 메인·하루 운세 결과 아래. 고르기 전엔 선택지, 고르면 바로 전체 결과(막대·%)와 내 선택 표시.
// 서버 /api/poll (auth.mjs). 하루 한 번, 비회원도 참여. 이모지·반짝임 없이 얇은 선과 글자 계층.
import { useEffect, useState } from 'react';
import { trackEvent } from '../lib/analytics.js';

export default function PollCard({ place = 'home' }) {
  const [p, setP] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch('/api/poll', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setP(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!p) return null;
  const voted = p.mine !== null && p.mine !== undefined;
  const vote = async (i) => {
    if (voted || busy) return;
    setBusy(true);
    const r = await fetch('/api/poll', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ choice: i }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (r?.ok && d) {
      setP(d);
      trackEvent('fortune_vote_submit', { place, choice: i });
    }
  };
  const [, m, dd] = p.date.split('-').map(Number);
  return (
    <section className="poll" aria-labelledby="poll-q">
      <div className="poll-head">
        <span className="poll-kicker">오늘의 질문</span>
        <span className="poll-date">
          {m}월 {dd}일{voted ? ` · ${p.total.toLocaleString('ko-KR')}명 참여` : ''}
        </span>
      </div>
      <h2 id="poll-q" className="poll-q">
        {p.q}
      </h2>
      <ul className={`poll-opts${voted ? ' is-voted' : ''}`}>
        {p.options.map((o, i) => {
          const pct = p.total ? Math.round((p.counts[i] / p.total) * 100) : 0;
          return (
            <li key={o}>
              <button type="button" onClick={() => vote(i)} disabled={voted || busy} aria-pressed={p.mine === i} className={p.mine === i ? 'is-mine' : ''}>
                {voted && <span className="poll-bar" style={{ width: `${pct}%` }} aria-hidden="true" />}
                <span className="poll-label">
                  {o}
                  {p.mine === i && <small>내 선택</small>}
                </span>
                {voted && <span className="poll-pct">{pct}%</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {!voted && <p className="poll-foot">고르면 다른 사람들의 선택을 바로 볼 수 있어요.</p>}
    </section>
  );
}
