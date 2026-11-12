// 사주천문 로고: 천동이 상반신 2D 일러스트 + 글자.
// 그림 원본은 src/brand/cheondong.js (파비콘과 같은 그림).
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

// 글자 높이를 아이콘 높이에 맞춤: 조선신명조 한글의 실제 글자 높이 ≈ 0.94em, 아이콘 그림 높이 ≈ 0.96 × size
export default function Logo({ size = 28 }) {
  return (
    <span className="logo">
      <LogoSymbol size={size} />
      <span className="logo-name" style={{ fontSize: Math.round(size * 1.02) }}>사주천문</span>
    </span>
  );
}
