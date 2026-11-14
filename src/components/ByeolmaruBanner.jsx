// 메인 가운데 별마루 입장 배너 (2026-11-15 사용자 지시: 카드 묶음과 따로 가운데, 'AI 티' 없이 트렌디하게)
// 납작한 밤색 면 + 큰 글자 + 선으로 그린 천문문·지평선 + 오늘 실제 달 모양. 빛 번짐·반짝임·그라데이션 없음.
// 아래 한 줄 정보: 음력 날짜·달 이름 | 지금 거니는 인원(/api/plaza, 실패하면 안 보임)
import { useEffect, useMemo, useState } from 'react';
import { skyState } from '../lib/byeolmaruSky.js';

// 음력 위상(0 새달 ~ 0.5 보름 ~ 1)으로 빛나는 부분 경로
function moonPath(r, p) {
  const k = Math.abs(Math.cos(2 * Math.PI * p)) * r;
  if (p < 0.5) return `M0,${-r} A${r},${r} 0 0 1 0,${r} A${k},${r} 0 0 ${p > 0.25 ? 1 : 0} 0,${-r}Z`;
  return `M0,${-r} A${r},${r} 0 0 0 0,${r} A${k},${r} 0 0 ${p > 0.75 ? 1 : 0} 0,${-r}Z`;
}
function moonName(day) {
  if (day <= 2 || day >= 29) return '그믐·새달';
  if (day <= 6) return '초승달';
  if (day <= 9) return '상현달';
  if (day <= 13) return '차오르는 달';
  if (day <= 17) return '보름달';
  if (day <= 21) return '기우는 달';
  if (day <= 24) return '하현달';
  return '그믐달';
}

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

  return (
    <section className="home-bm-wrap" aria-label="별마루">
      <button type="button" className="home-bm" onClick={onOpen}>
        <span className="home-bm-text">
          <span className="home-bm-eyebrow">밤하늘 마당</span>
          <strong>
            오늘 밤,
            <br />
            별마루로
          </strong>
          <span className="home-bm-desc">천동이와 걷고, 별을 헤아리고, 등불에 소원을 띄워요.</span>
          <span className="home-bm-meta">
            {sky && (
              <span>
                음력 {sky.lunarDay}일 · {moonName(sky.lunarDay)}
              </span>
            )}
            {sky?.special && <span>{sky.special.title}</span>}
            {people != null && <span>지금 {people}명</span>}
          </span>
        </span>
        <span className="home-bm-pic" aria-hidden="true">
          <svg viewBox="0 0 240 180" preserveAspectRatio="xMidYMax meet">
            {/* 달 (오늘 실제 모양) */}
            <g transform="translate(176 52)">
              <circle r="26" fill="none" stroke="rgba(243,228,191,0.28)" strokeWidth="1" />
              {sky && <path d={moonPath(26, sky.phase)} fill="#F3E4BF" />}
            </g>
            {/* 별 몇 개 — 점만 */}
            <g fill="rgba(243,228,191,0.7)">
              <circle cx="40" cy="30" r="1.3" />
              <circle cx="92" cy="18" r="1" />
              <circle cx="122" cy="62" r="1.2" />
              <circle cx="222" cy="104" r="1" />
              <circle cx="62" cy="78" r="0.9" />
            </g>
            {/* 천문문: 선으로 */}
            <g fill="none" stroke="#E2C27A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M44 104 Q96 92 148 104" />
              <path d="M52 112 H140" />
              <path d="M62 112 V160 M130 112 V160" />
              <path d="M58 124 H134" />
              <rect x="84" y="114" width="24" height="8" />
            </g>
            {/* 지평선 + 돌길 */}
            <path d="M0 160 H240" stroke="rgba(243,228,191,0.35)" strokeWidth="1" />
            <path d="M88 160 L74 180 M104 160 L118 180" stroke="rgba(243,228,191,0.22)" strokeWidth="1" />
          </svg>
        </span>
        <span className="home-bm-go" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    </section>
  );
}
