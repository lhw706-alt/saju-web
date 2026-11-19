// 마이페이지 '내 천동이' 탭 (/my/grow, 2026-11-19 사용자 지시 — 리텐션 기능 ②). 규칙은 src/lib/grow.js, 서버는 /api/grow.
// 천동이 그림(단계가 오를수록 둘레 빛이 커짐, 3일 넘게 안 오면 잠든 얼굴) · 단계 이름 · 기운 막대 · 연속 일수 · 오늘 할 일(얇은 줄 목록).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dosaFaceSvg } from '../brand/dosaArt.js';
import { LEVELS } from '../lib/grow.js';

export default function GrowBoard() {
  const [g, setG] = useState(null);
  const load = () =>
    fetch('/api/grow', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || '불러오지 못했어요.');
        setG(d);
      })
      .catch((e) => setG({ error: e.message }));
  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener('saju:grow', on);
    return () => window.removeEventListener('saju:grow', on);
  }, []);

  if (!g) return <p className="hint">불러오는 중…</p>;
  if (g.error) return <p className="rec-empty">{g.error}</p>;

  const pct = g.next ? Math.min(100, Math.round(((g.xp - g.min) / (g.next - g.min)) * 100)) : 100;
  const face = g.asleep ? { eyes: 'sleep', mouth: 'o' } : g.level >= 5 ? { eyes: 'happy', mouth: 'open' } : g.level >= 3 ? { eyes: 'happy', mouth: 'smile' } : { eyes: 'dot', mouth: 'smile' };
  const done = new Set(g.today || []);
  const left = Object.entries(g.actions || {}).filter(([k]) => !done.has(k));

  return (
    <section className="grow" aria-labelledby="grow-title">
      <div className={`grow-hero lv-${g.level}${g.asleep ? ' is-asleep' : ''}`}>
        <span className="grow-glow" aria-hidden="true" />
        <span className="grow-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: dosaFaceSvg(face) }} />
      </div>
      <p className="grow-kicker">{g.level}단계</p>
      <h2 id="grow-title" className="grow-name">
        {g.name}
      </h2>
      <p className="grow-say">
        {g.asleep ? '며칠 못 봐서 천동이가 다시 잠들었어요. 오늘 할 일을 하나만 해도 깨어나요.' : g.streak > 1 ? `${g.streak}일째 함께하고 있어요.` : '오늘도 와 줘서 고마워요.'}
      </p>

      <div className="grow-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="다음 단계까지">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="grow-meta">
        <span>기운 {g.xp.toLocaleString('ko-KR')}</span>
        <span>{g.next ? `다음 단계까지 ${(g.next - g.xp).toLocaleString('ko-KR')}${g.nextReward ? ` · 닿으면 ${g.nextReward}금전` : ''}` : '가장 높은 단계예요'}</span>
      </p>

      <h3 className="grow-h3">
        오늘 할 일 <small>{done.size} / {Object.keys(g.actions || {}).length}</small>
      </h3>
      <ul className="grow-list">
        {Object.entries(g.actions || {}).map(([k, a]) => (
          <li key={k} className={done.has(k) ? 'is-done' : ''}>
            <span className="grow-check" aria-hidden="true">
              {done.has(k) ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : null}
            </span>
            {done.has(k) ? <span className="grow-what">{a.label}</span> : <Link className="grow-what" to={a.to}>{a.label}</Link>}
            <span className="grow-xp">+{a.xp}</span>
          </li>
        ))}
      </ul>
      {left.length === 0 && <p className="grow-say">오늘 할 일을 다 했어요. 내일 또 만나요.</p>}

      <h3 className="grow-h3">단계</h3>
      <ol className="grow-levels">
        {LEVELS.map((l, i) => (
          <li key={l.name} className={i + 1 === g.level ? 'is-now' : i + 1 < g.level ? 'is-past' : ''}>
            <span>{i + 1}</span>
            {l.name}
            {l.reward ? <em>{l.reward}금전</em> : null}
          </li>
        ))}
      </ol>
      <p className="grow-note">할 일은 하루에 한 번씩 기운이 쌓여요. 단계 보상 금전은 무상 금전이라 환불 대상이 아니에요.</p>
    </section>
  );
}
