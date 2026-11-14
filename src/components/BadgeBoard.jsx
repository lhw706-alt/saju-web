// 마이페이지 '내 배지' (2026-11-14 리텐션 기획안 3번) — 레벨 + 연속 방문 + 배지 판(얻은 것 금빛 원판, 못 얻은 것 회색·진행도).
// 서버 /api/badges 가 활동 수를 세고, 기준은 src/lib/badges.js. 이모지 없이 한자 문양 원판.
import { useEffect, useState } from 'react';
import { badgeResult, levelOf, LEVELS } from '../lib/badges.js';
import { trackEvent } from '../lib/analytics.js';

function Medal({ b }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className="badge-medal">
      <defs>
        <linearGradient id={`bm-${b.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={b.earned ? '#f6df9c' : '#55575c'} />
          <stop offset=".55" stopColor={b.earned ? '#c99a3e' : '#3c3e43'} />
          <stop offset="1" stopColor={b.earned ? '#f0d595' : '#4a4c51'} />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="37" fill={`url(#bm-${b.id})`} />
      <circle cx="40" cy="40" r="30" fill={b.earned ? '#2a1d12' : '#26272b'} />
      <circle cx="40" cy="40" r="27" fill="none" stroke={b.earned ? '#e2c27a' : '#5a5c61'} strokeWidth="1" strokeDasharray="2 3" />
      <text x="40" y="51" textAnchor="middle" fontFamily="ChosunSm, serif" fontSize="30" fill={b.earned ? '#f3dc9a' : '#7a7c82'}>
        {b.han}
      </text>
    </svg>
  );
}

export default function BadgeBoard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    fetch('/api/badges', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || '배지를 불러오지 못했어요.');
        setD(j);
        trackEvent('badge_view');
      })
      .catch((e) => setErr(e.message));
  }, []);
  if (err) return <p className="my-sec-note">{err}</p>;
  if (!d) return <p className="my-sec-note">배지를 세는 중이에요…</p>;
  const list = badgeResult(d.stats);
  const earned = list.filter((b) => b.earned).length;
  const lv = levelOf(earned);
  return (
    <div className="badges">
      <div className="badge-top">
        <div>
          <span className="badge-lv">Lv.{lv.lv}</span>
          <h2 className="badge-title">{lv.name}</h2>
          <p className="badge-sub">
            배지 {earned} / {list.length}
            {lv.next ? ` · ${lv.next.min - earned}개 더 모으면 '${lv.next.name}'` : ' · 가장 높은 레벨이에요'}
          </p>
        </div>
        <div className="badge-streak">
          <b>{d.stats.streak}</b>
          <span>일 연속 방문</span>
        </div>
      </div>
      <div className="badge-levelbar" aria-hidden="true">
        {LEVELS.map((l, i) => (
          <i key={l.name} className={i < lv.lv ? 'on' : ''} />
        ))}
      </div>
      <ul className="badge-grid">
        {list.map((b) => (
          <li key={b.id} className={b.earned ? 'is-earned' : ''}>
            <Medal b={b} />
            <b>{b.name}</b>
            <span>{b.desc}</span>
            {!b.earned && b.goal > 1 && (
              <span className="badge-prog">
                {b.now} / {b.goal}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
