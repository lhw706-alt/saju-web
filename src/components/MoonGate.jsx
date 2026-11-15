// 별마루 입장 달 (2026-11-15 사용자 지시) — 메인 히어로 천동이 오른쪽에 떠 있는 달. 누르면 별마루로.
// 2차(사용자 지시: 사주천문 톤앤매너에 맞게): 판화 선 음영 구 대신 '옛 그림 속 달' —
//  한지빛 달 면(먹물 번진 듯한 옅은 얼룩) + 오늘 실제 음력 위상만큼 밝은 면, 아래를 지나는 금빛 선 구름(운문),
//  로고와 같은 붉은 낙관 '月'. 빛 번짐·그라데이션 없음. 마우스를 올리면 구름이 비켜나고, 누르면 꾹 눌렸다 퍼지는 선 → 이동.
import { useMemo, useState } from 'react';
import { skyState } from '../lib/byeolmaruSky.js';

// 음력 위상(0 새달 ~ 0.5 보름 ~ 1)으로 빛나는 부분 경로 (중심 0,0)
function litPath(r, p) {
  const k = Math.abs(Math.cos(2 * Math.PI * p)) * r;
  if (p < 0.5) return `M0,${-r} A${r},${r} 0 0 1 0,${r} A${k},${r} 0 0 ${p > 0.25 ? 1 : 0} 0,${-r}Z`;
  return `M0,${-r} A${r},${r} 0 0 0 0,${r} A${k},${r} 0 0 ${p > 0.75 ? 1 : 0} 0,${-r}Z`;
}
function moonName(day) {
  if (day <= 2 || day >= 29) return '그믐';
  if (day <= 6) return '초승달';
  if (day <= 9) return '상현달';
  if (day <= 13) return '차오르는 달';
  if (day <= 17) return '보름달';
  if (day <= 21) return '기우는 달';
  if (day <= 24) return '하현달';
  return '그믐달';
}

export default function MoonGate({ onEnter }) {
  const [going, setGoing] = useState(false);
  const sky = useMemo(() => {
    try {
      return skyState();
    } catch {
      return null;
    }
  }, []);
  // 새달·그믐엔 너무 안 보이니 가는 초승달 이상으로
  const raw = sky?.phase ?? 0.3;
  const phase = raw < 0.08 ? 0.08 : raw > 0.92 ? 0.92 : raw;
  const R = 70;

  const enter = () => {
    if (going) return;
    setGoing(true);
    setTimeout(onEnter, 420);
  };

  return (
    <button type="button" className={`moon-gate${going ? ' is-going' : ''}`} onClick={enter} aria-label={`달빛 따라 별마루로${sky ? ` — 오늘 밤 ${moonName(sky.lunarDay)}` : ''}`}>
      <span className="moon-gate-orb">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            {/* 3차(2026-11-15 사용자 지시): 은은한 그라데이션 — 빛 받는 가장자리가 가장 밝고 경계선 쪽으로 따뜻하게 어두워짐, 경계는 살짝 흐리게 */}
            <radialGradient id="mg-face" cx={phase < 0.5 ? '72%' : '28%'} cy="38%" r="78%">
              <stop offset="0" stopColor="#FBF3DE" />
              <stop offset="0.55" stopColor="#EADBB6" />
              <stop offset="1" stopColor="#C8B183" />
            </radialGradient>
            <radialGradient id="mg-dark" cx="50%" cy="45%" r="60%">
              <stop offset="0" stopColor="rgba(241,228,195,0.10)" />
              <stop offset="1" stopColor="rgba(241,228,195,0.03)" />
            </radialGradient>
            <filter id="mg-soft" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
            <clipPath id="mg-disc">
              <circle cx="100" cy="92" r={R} />
            </clipPath>
            <clipPath id="mg-lit">
              <path d={litPath(R + 4, phase)} transform="translate(100 92)" />
            </clipPath>
          </defs>
          {/* 어두운 쪽: 달 테두리만 옅게 */}
          <circle cx="100" cy="92" r={R} fill="url(#mg-dark)" stroke="rgba(241,228,195,0.22)" strokeWidth="1" />
          {/* 밝은 쪽: 한지빛 면 + 먹물 얼룩 */}
          <g clipPath="url(#mg-disc)">
          <g filter="url(#mg-soft)">
          <g clipPath="url(#mg-lit)">
            <circle cx="100" cy="92" r={R + 2} fill="url(#mg-face)" />
            <g fill="#B89F70" opacity="0.28">
              <ellipse cx="122" cy="70" rx="16" ry="11" />
              <ellipse cx="138" cy="104" rx="9" ry="12" />
              <ellipse cx="108" cy="118" rx="12" ry="7" />
              <circle cx="84" cy="80" r="8" />
              <circle cx="150" cy="80" r="4" />
              <circle cx="96" cy="58" r="3.5" />
            </g>
          </g>
          </g>
          </g>
          {/* 금빛 선 구름(운문) — 달 아래를 지나감 */}
          <g className="moon-gate-cloud" fill="#1B1C1E" stroke="#E2C27A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 168 C 18 156, 34 150, 44 158 C 46 142, 70 138, 78 152 C 84 136, 112 134, 118 150 C 126 140, 148 144, 148 160 C 160 158, 170 164, 168 172 L 26 172 C 18 172, 16 170, 18 168 Z" />
            <path d="M44 158 c 4 -4 10 -2 10 3 c 0 4 -6 5 -7 1" fill="none" />
            <path d="M78 152 c 5 -5 13 -2 12 4 c -1 5 -8 5 -8 1" fill="none" />
            <path d="M118 150 c 5 -4 12 -1 11 4 c -1 4 -7 4 -7 0" fill="none" />
            <path d="M176 172 c 6 0 10 -4 8 -8 c -2 -3 -7 -2 -6 2" fill="none" />
          </g>
          {/* 붉은 낙관 月 (로고 天文 낙관과 같은 결) */}
          <g transform="translate(150 28) rotate(-4)">
            <rect x="-13" y="-13" width="26" height="26" rx="3" fill="#B8352B" />
            <text x="0" y="6" textAnchor="middle" fontFamily="ChosunSm, serif" fontSize="17" fill="#F6E9D6">
              月
            </text>
          </g>
        </svg>
        <span className="moon-gate-ring" aria-hidden="true" />
      </span>
      <span className="moon-gate-label">
        <span>달빛 따라</span>
        <b>별마루로</b>
      </span>
    </button>
  );
}
