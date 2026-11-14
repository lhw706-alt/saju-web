// 메인 가운데 별마루 입장 배너 (2026-11-15 사용자 지시: 카드 묶음과 따로, 조금 강조해서 중간에, 다른 UI 로 특별하게)
// 실제 오늘 밤 달 모양(음력)·특별한 날 문구·지금 걷는 사람 수(/api/plaza, CDN 10초 캐시 — 실패하면 안 보임)를 보여 줌.
import { useEffect, useMemo, useState } from 'react';
import { skyState } from '../lib/byeolmaruSky.js';
import { dosaArtSvg } from '../brand/dosaArt.js';

const ART = dosaArtSvg('byeolmaru');

// 음력 위상(0 새달 ~ 0.5 보름 ~ 1)으로 빛나는 부분 경로
function moonPath(r, p) {
  const k = Math.abs(Math.cos(2 * Math.PI * p)) * r;
  if (p < 0.5) return `M0,${-r} A${r},${r} 0 0 1 0,${r} A${k},${r} 0 0 ${p > 0.25 ? 1 : 0} 0,${-r}Z`;
  return `M0,${-r} A${r},${r} 0 0 0 0,${r} A${k},${r} 0 0 ${p > 0.75 ? 1 : 0} 0,${-r}Z`;
}

// 반짝이는 별 자리 (고정 — 늘 같은 하늘)
const STARS = Array.from({ length: 34 }, (_, i) => {
  const a = Math.sin(i * 91.7 + 1) * 10000;
  const b = Math.sin(i * 47.3 + 2) * 10000;
  return { x: (a - Math.floor(a)) * 100, y: (b - Math.floor(b)) * 78, s: i % 7 === 0 ? 2.4 : i % 3 === 0 ? 1.7 : 1.1, d: (i % 9) * 0.45 };
});

export default function ByeolmaruBanner({ onOpen }) {
  const sky = useMemo(() => {
    try {
      return skyState();
    } catch {
      return null;
    }
  }, []);
  const [people, setPeople] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/plaza')
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => alive && r && r.count > 0 && setPeople(r.count))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const line = sky?.special
    ? `오늘은 ${sky.special.title}. ${sky.special.line}`
    : sky
      ? `오늘 밤은 음력 ${sky.lunarDay}일, 하늘에 이런 달이 떠 있어요. 별을 헤아리며 쉬어 가요.`
      : '밤하늘 마당을 거닐며 별을 헤아리고 쉬어 가요.';

  return (
    <section className="home-bm-wrap" aria-label="별마루">
      <button type="button" className="home-bm" onClick={onOpen}>
        <span className="home-bm-sky" aria-hidden="true">
          {STARS.map((s, i) => (
            <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
          ))}
          <b className="home-bm-lantern l1" />
          <b className="home-bm-lantern l2" />
          <b className="home-bm-lantern l3" />
        </span>
        {sky && (
          <svg className="home-bm-moon" viewBox="-30 -30 60 60" aria-hidden="true">
            <circle r="22" fill="rgba(255,255,255,0.07)" />
            <path d={moonPath(22, sky.phase)} fill="#F3E4BF" />
          </svg>
        )}
        <span className="home-bm-text">
          <small>밤하늘 마당</small>
          <strong>별마루</strong>
          <span className="home-bm-desc">{line}</span>
          <span className="home-bm-foot">
            <span className="home-bm-go">마당에 들어가기</span>
            {people != null && <span className="home-bm-people">지금 {people}명이 거닐고 있어요</span>}
          </span>
        </span>
        <span className="home-bm-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ART }} />
        <span className="home-bm-ground" aria-hidden="true" />
      </button>
    </section>
  );
}
