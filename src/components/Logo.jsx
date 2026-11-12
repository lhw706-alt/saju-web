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

export default function Logo({ size = 34, hanja = true }) {
  return (
    <span className="logo">
      <LogoSymbol size={size} />
      <span className="logo-text">
        <span className="logo-name">사주천문</span>
        {hanja && <span className="logo-hanja">四柱天文</span>}
      </span>
    </span>
  );
}
