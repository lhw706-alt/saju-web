// 천동이 2D 일러스트 (상반신) — 로고 아이콘·파비콘·3D 대체 이미지가 함께 쓰는 원본.
// 파비콘 파일(public/favicon.svg, PNG)은 이 함수로 만든다: scratchpad 의 make-icons 스크립트 참고 (CLAUDE.md).
//   bg: true  → 남색 둥근 사각형 배경 (파비콘)
//   bg: false → 배경 없음 (어두운 화면 위 로고)

export function cheondongBustSvg({ bg = false, id = 'cd' } = {}) {
  const body = 'M5 66 C5 41 13.5 17 32 17 C50.5 17 59 41 59 66 Z';
  const bust = `
    <path d="M36.2 2.6 a7.4 7.4 0 1 0 4.4 12.5 a5.9 5.9 0 1 1 -4.4 -12.5z" fill="url(#${id}-gold)"/>
    <path d="M35.2 4.6 a5.6 5.6 0 0 0 -1.6 5.2" fill="none" stroke="#fff6d8" stroke-width="1.1" stroke-linecap="round" opacity="0.8"/>
    <path d="${body}" fill="url(#${id}-body)"/>
    <path d="${body}" fill="url(#${id}-rimL)"/>
    <path d="${body}" fill="url(#${id}-rimR)"/>
    <ellipse cx="22" cy="27" rx="6.5" ry="3.4" transform="rotate(-32 22 27)" fill="#ffffff" opacity="0.55"/>
    <circle cx="32" cy="29.5" r="4.6" fill="url(#${id}-markGlow)"/>
    <path d="M32 26 l2 3.5 -2 3.5 -2 -3.5z" fill="#f2c45e"/>
    <path d="M20.6 40.5 q3.7 3.6 7.4 0" fill="none" stroke="#2a2440" stroke-width="2.1" stroke-linecap="round"/>
    <path d="M36 40.5 q3.7 3.6 7.4 0" fill="none" stroke="#2a2440" stroke-width="2.1" stroke-linecap="round"/>
    <ellipse cx="17" cy="47.5" rx="3.6" ry="2" fill="#ff9fb4" opacity="0.55"/>
    <ellipse cx="47" cy="47.5" rx="3.6" ry="2" fill="#ff9fb4" opacity="0.55"/>`;

  const defs = `
    <defs>
      <radialGradient id="${id}-body" cx="42%" cy="30%" r="78%">
        <stop offset="0" stop-color="#fffcf5"/>
        <stop offset="0.5" stop-color="#f2e8d6"/>
        <stop offset="1" stop-color="#cbbbe4"/>
      </radialGradient>
      <linearGradient id="${id}-rimL" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#8fd6ff" stop-opacity="0.55"/>
        <stop offset="0.22" stop-color="#8fd6ff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${id}-rimR" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stop-color="#ffa3d2" stop-opacity="0.5"/>
        <stop offset="0.22" stop-color="#ffa3d2" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="${id}-markGlow">
        <stop offset="0" stop-color="#ffd98a" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#ffd98a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f8e2a6"/>
        <stop offset="1" stop-color="#d2a240"/>
      </linearGradient>
      <linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1f2556"/>
        <stop offset="1" stop-color="#0b0e1c"/>
      </linearGradient>
      <radialGradient id="${id}-aura" cx="50%" cy="48%" r="50%">
        <stop offset="0" stop-color="#ffd98a" stop-opacity="0.35"/>
        <stop offset="1" stop-color="#ffd98a" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="${id}-clip"><rect width="64" height="64" rx="14"/></clipPath>
    </defs>`;

  const inner = bg
    ? `<g clip-path="url(#${id}-clip)"><rect width="64" height="64" fill="url(#${id}-bg)"/><circle cx="32" cy="34" r="30" fill="url(#${id}-aura)"/><g transform="translate(3.5 5) scale(0.89)">${bust}</g></g>`
    : `<g clip-path="url(#${id}-clip)">${bust}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${defs}${inner}</svg>`;
}
