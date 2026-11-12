// 천동이 상반신 2D 일러스트(LogoSymbol): 파비콘·3D 대체 이미지용. 원본은 src/brand/cheondong.js
// 사주천문 로고(Logo): 붓글씨 워드마크 + 붉은 낙관(天文) — 타이포그래피 로고 (2026-11-13)
import { cheondongBustSvg } from '../brand/cheondong.js';

const BUST = cheondongBustSvg({ id: 'logo-cd' });
const BUST_BG = cheondongBustSvg({ bg: true, id: 'logo-cdbg' });

export function LogoSymbol({ size = 32, withBg = false, className = '' }) {
  return (
    <span
      className={`logo-symbol ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: withBg ? BUST_BG : BUST }}
    />
  );
}

// 붓글씨: 나눔붓글씨(Nanum Brush Script, OFL — 상업 사용·웹 임베딩 허용). index.html 에서 '사주천문' 네 글자만 받음
// 낙관: 붉은 도장에 天文 (조선신명조)
export default function Logo({ size = 34 }) {
  return (
    <span className="logo" style={{ fontSize: size }}>
      <span className="logo-word">사주천문</span>
      <span className="logo-seal" aria-hidden="true">
        <span>天</span>
        <span>文</span>
      </span>
    </span>
  );
}
