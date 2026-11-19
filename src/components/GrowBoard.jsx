// 마이페이지 '내 천동이' 탭 (/my/grow, 2026-11-19 사용자 지시 — 리텐션 기능 ②). 규칙은 src/lib/grow.js, 서버는 /api/grow.
// 2차(같은 날 사용자 지시 'AI 티' 빼기): 체크 목록·진행 막대·단계 표 대신 — 천동이 한마디(다음에 할 일을 천동이 말투로),
// 단계는 점 7개 + 다음 보상 한 줄, 오늘 할 일은 낙관 같은 붉은 한자 도장 6개(한 일은 찍힘, 안 한 일은 눌러서 하러 가기).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dosaFaceSvg } from '../brand/dosaArt.js';
import { LEVELS } from '../lib/grow.js';

const STAMP = { visit: '訪', fortune: '運', diary: '記', star: '星', cheer: '願', iljoo: '日' };
const SHORT = { visit: '들르기', fortune: '오늘 운세', diary: '운세 일기', star: '별 헤아리기', cheer: '소원 응원', iljoo: '일주 카드' };
// 아직 안 한 일 → 천동이 한마디
const SAY = {
  visit: '왔구나. 오늘도 기운 좀 나눠 줄래?',
  fortune: '오늘 운세를 같이 보면 눈이 번쩍 뜨일 텐데.',
  diary: '오늘 하루는 어땠어? 한 줄만 들려줘.',
  star: '별마루 하늘에 별 하나만 켜 줘.',
  cheer: '누군가의 소원에 응원 하나 보내 볼까?',
  iljoo: '친구 일주도 궁금하지 않아?',
};

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

  const done = new Set(g.today || []);
  const keys = Object.keys(g.actions || {});
  const nextTodo = keys.find((k) => !done.has(k));
  const face = g.asleep ? { eyes: 'sleep', mouth: 'o' } : g.level >= 5 ? { eyes: 'happy', mouth: 'open' } : g.level >= 3 ? { eyes: 'happy', mouth: 'smile' } : { eyes: 'dot', mouth: 'smile' };
  const say = g.asleep ? '음냐… 며칠 못 봐서 다시 잠들었어. 하나만 해 주면 깨어날게.' : nextTodo ? SAY[nextTodo] : '오늘은 기운이 가득해. 내일 또 와.';
  const nextLv = LEVELS[g.level] || null;

  return (
    <section className="grow" aria-labelledby="grow-title">
      <div className={`grow-hero lv-${g.level}${g.asleep ? ' is-asleep' : ''}`}>
        <span className="grow-glow" aria-hidden="true" />
        <span className="grow-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: dosaFaceSvg(face) }} />
      </div>
      <p className="grow-say">“{say}”</p>
      <h2 id="grow-title" className="grow-name">
        {g.name}
      </h2>
      <ol className="grow-dots" aria-label={`${LEVELS.length}단계 중 ${g.level}단계`}>
        {LEVELS.map((l, i) => (
          <li key={l.name} className={i + 1 < g.level ? 'is-past' : i + 1 === g.level ? 'is-now' : ''} />
        ))}
      </ol>
      <p className="grow-meta">
        기운 {g.xp.toLocaleString('ko-KR')}
        {nextLv ? ` · ${nextLv.name}까지 ${(g.next - g.xp).toLocaleString('ko-KR')}${nextLv.reward ? `, 닿으면 ${nextLv.reward}금전` : ''}` : ' · 가장 높은 단계'}
        {g.streak > 1 ? ` · ${g.streak}일째` : ''}
      </p>

      <h3 className="grow-h3">오늘 준 기운</h3>
      <ul className="grow-stamps">
        {keys.map((k) => {
          const a = g.actions[k];
          const inner = (
            <>
              <span className="grow-seal" aria-hidden="true">
                {STAMP[k]}
              </span>
              <span className="grow-cap">{SHORT[k] || a.label}</span>
            </>
          );
          return (
            <li key={k} className={done.has(k) ? 'is-done' : ''}>
              {done.has(k) ? (
                <span aria-label={`${a.label} 했어요`}>{inner}</span>
              ) : (
                <Link to={a.to} aria-label={`${a.label} 하러 가기 (기운 ${a.xp})`}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <p className="grow-note">도장은 하루에 한 번씩 찍혀요. 안 찍힌 도장을 누르면 하러 갈 수 있어요. 단계 보상은 무상 금전이에요(환불 대상 아님).</p>
    </section>
  );
}
