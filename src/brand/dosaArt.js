// 콘텐츠 카드용 천둥도사(천동이) 일러스트 — 같은 몸(진주빛 물방울·금빛 초승달·이마 표식)에 콘텐츠마다 다른 표정(FACES)과
// 소품(PROPS)을 그린다. SVG 문자열을 돌려줌 (좌표 160×120, 보이는 영역은 가운데 136×102).
// kind: contents.js 의 id. 모르는 kind 면 소품 없이 기본 모습.

const GOLD = '#f0d595';
const GOLD_D = '#d2a240';
const RED = '#d2373d';
const INK = '#2a2440';
const PAPER = '#f6ead0';

const star = (x, y, r = 3, c = GOLD) =>
  `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3}Z" fill="${c}"/>`;

// 표정: 눈(eyes)·눈썹(brows)·입(mouth) 조합. 눈 중심 (72.3, 62)·(87.7, 62), 입 (80, 71)
const L = 72.3;
const R = 87.7;
const EY = 62;
const line = (d, w = 2.1) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`;
const dotEye = (x, look = 0) =>
  `<ellipse cx="${x + look}" cy="${EY}" rx="2.6" ry="3.3" fill="${INK}"/><circle cx="${x + look + 0.9}" cy="${EY - 1.2}" r="0.95" fill="#fff"/>`;
const heartAt = (x, y, k = 1) =>
  `<path transform="translate(${x} ${y}) scale(${k})" d="M0 3.2 C-4.6 0 -3.6 -3.4 -1.6 -2.8 C-0.6 -2.5 0 -1.6 0 -1 C0 -1.6 0.6 -2.5 1.6 -2.8 C3.6 -3.4 4.6 0 0 3.2Z" fill="${RED}"/>`;
const EYES = {
  closed: () => line('M68.6 62 q3.7 3.6 7.4 0M84 62 q3.7 3.6 7.4 0'),
  sleep: () => line('M68.6 63 q3.7 2.2 7.4 0M84 63 q3.7 2.2 7.4 0', 2),
  happy: () => line('M68.8 63.5 q3.5 -4.4 7 0M84.2 63.5 q3.5 -4.4 7 0', 2.2),
  dot: () => dotEye(L) + dotEye(R),
  side: () => dotEye(L, 1.4) + dotEye(R, 1.4),
  wink: () => dotEye(L) + line('M84.2 63 q3.5 -3.6 7 0', 2.2),
  smug: () => `<path d="M69 61.6 h6.6 a3.3 3 0 0 1 -6.6 0z M84.4 61.6 h6.6 a3.3 3 0 0 1 -6.6 0z" fill="${INK}"/>` + line('M68.4 61.4 h7.8M83.8 61.4 h7.8', 1.6),
  star: () => [L, R].map((x) => star(x, EY, 3.8, '#ffcf6b') + `<circle cx="${x}" cy="${EY}" r="1" fill="#fff"/>`).join(''),
  heart: () => heartAt(L, EY) + heartAt(R, EY),
  wide: () => [L, R].map((x) => `<circle cx="${x}" cy="${EY}" r="3.3" fill="#fff" stroke="${INK}" stroke-width="1.3"/><circle cx="${x}" cy="${EY + 0.4}" r="1.6" fill="${INK}"/>`).join(''),
};
const BROWS = {
  none: '',
  firm: line('M68.8 56.2 l6.4 1.4M91.2 56.2 l-6.4 1.4', 1.6),
  raise: line('M69 57 q3 -1.6 6 0M84.6 55.4 q3 -1.6 6 0', 1.5),
  soft: line('M69 56.6 q3 -1.2 6 0M85 56.6 q3 -1.2 6 0', 1.3),
};
const MOUTH = {
  none: '',
  smile: line('M77.6 70.4 q2.4 2.4 4.8 0', 1.6),
  open: `<path d="M76.8 69.8 h6.4 q-0.2 4.6 -3.2 4.6 q-3 0 -3.2 -4.6z" fill="#5a2a3a"/><path d="M78.2 72.8 q1.8 1.2 3.6 0" fill="none" stroke="#ff8fa8" stroke-width="1.4" stroke-linecap="round"/>`,
  o: `<ellipse cx="80" cy="71.4" rx="1.8" ry="2.2" fill="#5a2a3a"/>`,
  smirk: line('M77.2 71.2 q2.8 1.2 5.6 -1.4', 1.6),
  cat: line('M76.6 70.2 q1.7 2 3.4 0 q1.7 2 3.4 0', 1.5),
  flat: line('M77.6 71.2 h4.8', 1.6),
};

function base(id, { eyes = 'closed', mouth = 'none', brows = 'none' } = {}) {
  const body = 'M54 104 C50 72 60 40 80 40 C100 40 110 72 106 104 Q80 110 54 104 Z';
  const face = (EYES[eyes] || EYES.closed)() + (BROWS[brows] || '') + (MOUTH[mouth] || '');
  return {
    defs: `
      <radialGradient id="${id}-b" cx="42%" cy="30%" r="78%"><stop offset="0" stop-color="#fffcf5"/><stop offset=".5" stop-color="#f2e8d6"/><stop offset="1" stop-color="#cbbbe4"/></radialGradient>
      <linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8e2a6"/><stop offset="1" stop-color="${GOLD_D}"/></linearGradient>
      <radialGradient id="${id}-m"><stop offset="0" stop-color="#ffd98a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>`,
    back: `<ellipse cx="80" cy="107" rx="30" ry="4" fill="#000" opacity=".28"/>`,
    body: `
      <path d="M80.2 25.6 a7.4 7.4 0 1 0 4.4 12.5 a5.9 5.9 0 1 1 -4.4 -12.5z" fill="url(#${id}-g)"/>
      <path d="${body}" fill="url(#${id}-b)"/>
      <ellipse cx="70" cy="51" rx="6.5" ry="3.4" transform="rotate(-32 70 51)" fill="#fff" opacity=".55"/>
      <circle cx="80" cy="52" r="4.6" fill="url(#${id}-m)"/>
      <path d="M80 48.5 l2 3.5 -2 3.5 -2 -3.5z" fill="#f2c45e"/>
      ${face}
      <ellipse cx="65" cy="70" rx="3.6" ry="2" fill="#ff9fb4" opacity=".55"/>
      <ellipse cx="95" cy="70" rx="3.6" ry="2" fill="#ff9fb4" opacity=".55"/>
      <ellipse cx="68" cy="104" rx="8" ry="4.5" fill="#efe3d0"/>
      <ellipse cx="92" cy="104" rx="8" ry="4.5" fill="#efe3d0"/>`,
    hands: `<circle cx="57" cy="86" r="6" fill="#f3e9da"/><circle cx="103" cy="86" r="6" fill="#f3e9da"/>`,
  };
}

// 소품: [뒤(몸 뒤에 그림), 앞(손 위에 그림)]
const PROPS = {
  life: () => [
    star(30, 30) + star(132, 24, 2.4),
    `<rect x="58" y="80" width="44" height="18" rx="2" fill="${PAPER}"/><rect x="54" y="78" width="6" height="22" rx="3" fill="${GOLD_D}"/><rect x="100" y="78" width="6" height="22" rx="3" fill="${GOLD_D}"/>
     <path d="M64 85h32M64 89h26M64 93h30" stroke="#b08a3a" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`,
  ],
  newyear: () => [
    `<g stroke="${GOLD}" stroke-width="2" stroke-linecap="round" opacity=".9">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 -7 V-13" transform="translate(32 34) rotate(${a})"/>`).join('')}</g>
     <g stroke="#ff8f7a" stroke-width="1.8" stroke-linecap="round" opacity=".85">${[0, 60, 120, 180, 240, 300].map((a) => `<path d="M0 -5 V-10" transform="translate(130 28) rotate(${a})"/>`).join('')}</g>`,
    `<g transform="translate(103 70)"><path d="M0 16 V-2" stroke="${GOLD_D}" stroke-width="1.6"/><rect x="-8" y="-14" width="16" height="13" rx="6" fill="${RED}"/><path d="M-4 -1 h8" stroke="${GOLD}" stroke-width="1.4"/><text x="0" y="-4.5" text-anchor="middle" font-size="7" fill="${GOLD}" font-family="ChosunSm, serif">新</text></g>`,
  ],
  tojeong: () => [
    `<g transform="translate(130 36)" fill="${GOLD}" opacity=".9">${[0, 1, 2].map((i) => (i === 1 ? `<rect x="-10" y="${i * 6 - 6}" width="8" height="3" rx="1.5"/><rect x="2" y="${i * 6 - 6}" width="8" height="3" rx="1.5"/>` : `<rect x="-10" y="${i * 6 - 6}" width="20" height="3" rx="1.5"/>`)).join('')}</g>
     <g transform="translate(30 40)" fill="${GOLD}" opacity=".6">${[0, 1, 2].map((i) => (i !== 1 ? `<rect x="-8" y="${i * 5 - 5}" width="6" height="2.6" rx="1.3"/><rect x="2" y="${i * 5 - 5}" width="6" height="2.6" rx="1.3"/>` : `<rect x="-8" y="${i * 5 - 5}" width="16" height="2.6" rx="1.3"/>`)).join('')}</g>`,
    `<rect x="62" y="78" width="36" height="22" rx="3" fill="#3a2a1c"/><rect x="64" y="80" width="32" height="18" rx="2" fill="${PAPER}"/><text x="80" y="94" text-anchor="middle" font-size="12" fill="#7a5a22" font-family="ChosunSm, serif">卦</text>`,
  ],
  today: () => [
    `<circle cx="126" cy="34" r="12" fill="#ffcf6b"/><g stroke="#ffcf6b" stroke-width="2" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 -16 V-21" transform="translate(126 34) rotate(${a})"/>`).join('')}</g>`,
    '',
  ],
  tomorrow: () => [
    `<path d="M128 20 a12 12 0 1 0 8 21 a9.5 9.5 0 1 1 -8 -21z" fill="${GOLD}"/>` + star(32, 32, 3) + star(44, 18, 2) + star(116, 52, 2),
    '',
  ],
  date: () => [
    star(30, 32, 2.6),
    `<g transform="translate(108 66)"><rect x="0" y="0" width="26" height="26" rx="4" fill="${PAPER}"/><rect x="0" y="0" width="26" height="8" rx="4" fill="${RED}"/><rect x="0" y="4" width="26" height="4" fill="${RED}"/><path d="M7 16 l4 4 8 -8" fill="none" stroke="#3f8f5a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  ],
  // 궁합 화면 남자 천둥도사: 반투명 검은 갓 + 구슬 갓끈 + 파란 옷고름
  male: () => [
    `<path d="M28 34 l2 4 4 1 -4 1 -2 4 -2 -4 -4 -1 4 -1z" fill="${GOLD}" opacity=".7"/>`,
    `<rect x="70" y="30.5" width="20" height="12" rx="4.5" fill="#3b3560" opacity=".82" stroke="#9a90c8" stroke-width=".7"/>
     <ellipse cx="80" cy="42.6" rx="27" ry="4.4" fill="#3b3560" opacity=".92" stroke="#9a90c8" stroke-width=".8"/>
     <ellipse cx="80" cy="41.8" rx="25" ry="2.4" fill="#4a4270" opacity=".55"/>
     <path d="M58 45 Q60 62 66 77M102 45 Q100 62 94 77" fill="none" stroke="#b08a3a" stroke-dasharray="0.1 3.2" stroke-linecap="round" stroke-width="2.4"/>
     <path d="M74 93 l6 -3 6 3 -6 3z" fill="#6b8fd6"/><path d="M80 96 l-3 9M80 96 l3 9" stroke="#6b8fd6" stroke-width="2.2" stroke-linecap="round"/>`,
  ],
  // 궁합 화면 여자 천둥도사: 꽃 비녀 + 속눈썹 + 붉은 옷고름
  female: () => [
    `<path d="M132 34 l2 4 4 1 -4 1 -2 4 -2 -4 -4 -1 4 -1z" fill="${GOLD}" opacity=".7"/>`,
    `<path d="M88 52 L110 40" stroke="${GOLD_D}" stroke-width="2.2" stroke-linecap="round"/>
     <g transform="translate(97 46)">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-4.2" rx="3" ry="4.2" transform="rotate(${a})" fill="#ff8fb1"/>`).join("")}<circle r="2.4" fill="#ffd36b"/></g>
     <path d="M67.6 60.6 l-1.8 -1.6M76.6 60.6 l1.8 -1.6M83.4 60.6 l-1.8 -1.6M92.4 60.6 l1.8 -1.6" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>
     <path d="M74 93 l6 -3 6 3 -6 3z" fill="${RED}"/><path d="M80 96 l-3 9M80 96 l3 9" stroke="${RED}" stroke-width="2.2" stroke-linecap="round"/>`,
  ],
  match: () => [
    `<path d="M20 84 C40 70 50 96 60 86" fill="none" stroke="${RED}" stroke-width="2"/><path d="M100 86 C112 96 122 70 140 84" fill="none" stroke="${RED}" stroke-width="2"/>`,
    `<path d="M80 98 C66 88 66 78 74 77 C78 76.5 80 80 80 82 C80 80 82 76.5 86 77 C94 78 94 88 80 98Z" fill="${RED}"/><path d="M60 86 C66 90 70 92 74 92M100 86 C94 90 90 92 86 92" fill="none" stroke="${RED}" stroke-width="2"/>`,
  ],
  namematch: () => [
    `<g transform="translate(24 30) rotate(-10)"><rect width="22" height="14" rx="3" fill="${PAPER}"/><text x="11" y="10.5" text-anchor="middle" font-size="9" fill="#7a5a22" font-family="ChosunSm, serif">名</text></g><g transform="translate(116 26) rotate(10)"><rect width="22" height="14" rx="3" fill="${PAPER}"/><text x="11" y="10.5" text-anchor="middle" font-size="9" fill="#7a5a22" font-family="ChosunSm, serif">名</text></g>`,
    `<path d="M80 96 C70 89 70 82 75 81 C78 80.5 80 83 80 84 C80 83 82 80.5 85 81 C90 82 90 89 80 96Z" fill="#ff8fa8"/>`,
  ],
  number: () => [
    [7, 23, 38].map((n, i) => `<g transform="translate(${26 + i * 4} ${24 + i * 16})"><circle r="8" fill="${['#ffcf6b', '#7fb2ff', '#ff8f7a'][i]}"/><text y="3.2" text-anchor="middle" font-size="9" font-weight="600" fill="#1b1c1e" font-family="sans-serif">${n}</text></g>`).join('') +
      [12, 31, 44].map((n, i) => `<g transform="translate(${134 - i * 4} ${24 + i * 16})"><circle r="8" fill="${['#6dbb8a', '#ffcf6b', '#c9b8ff'][i]}"/><text y="3.2" text-anchor="middle" font-size="9" font-weight="600" fill="#1b1c1e" font-family="sans-serif">${n}</text></g>`).join(''),
    '',
  ],
  blessing: () => [
    star(30, 30, 2.6) + star(132, 30, 2.6),
    `<g transform="translate(80 88)"><path d="M-14 -6 C-18 4 -14 14 0 14 C14 14 18 4 14 -6 Z" fill="${RED}"/><path d="M-12 -7 C-6 -12 6 -12 12 -7" fill="none" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/><circle r="6" cy="3" fill="${GOLD}"/><text y="6" text-anchor="middle" font-size="7.5" fill="${RED}" font-family="ChosunSm, serif">福</text></g>`,
  ],
  moving: () => [
    star(28, 28, 2.4),
    `<g transform="translate(104 62)"><path d="M0 12 L14 0 L28 12 V30 H0Z" fill="${PAPER}"/><path d="M-3 13 L14 -2 L31 13" fill="none" stroke="${RED}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><rect x="10" y="18" width="8" height="12" rx="1.5" fill="#b08a3a"/></g>`,
  ],
  wish: () => [
    `<path d="M20 20 L44 36" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" opacity=".6"/>` + star(46, 38, 5) + star(128, 26, 2.4) + star(138, 50, 1.8),
    `<g transform="translate(103 70)"><path d="M0 16 V0" stroke="${GOLD_D}" stroke-width="1.4"/><path d="M-7 -12 h14 l-2 12 h-10z" fill="#ffcf6b" opacity=".95"/><circle cy="-6" r="2.5" fill="#fff6d8"/></g>`,
  ],
  charm: () => [
    star(30, 30, 2.4) + star(132, 28, 2.4),
    `<g transform="translate(70 70) rotate(-6)"><rect width="22" height="30" rx="2.5" fill="${GOLD}"/><rect x="2.5" y="2.5" width="17" height="25" rx="1.2" fill="none" stroke="${RED}" stroke-width="1.2"/><circle cx="11" cy="11.5" r="5" fill="none" stroke="${RED}" stroke-width="1.3"/><text x="11" y="14.6" text-anchor="middle" font-size="8" fill="${RED}" font-family="ChosunSm, serif">福</text><path d="M6.5 20.5q4.5-2 9 0M6.5 23.5q4.5-2 9 0" fill="none" stroke="${RED}" stroke-width="1.1" stroke-linecap="round"/></g>`,
  ],
  sal: () => [
    `<path d="M18 40 C30 28 40 52 52 40" fill="none" stroke="#c9b8ff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/><path d="M108 36 C120 24 130 48 142 36" fill="none" stroke="#c9b8ff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>` + star(80, 20, 2.6),
    `<path d="M60 88 C68 80 74 96 80 88 C86 80 92 96 100 88" fill="none" stroke="${GOLD}" stroke-width="2.6" stroke-linecap="round"/>`,
  ],
  ask: () => [
    `<g transform="translate(112 18)"><rect width="34" height="26" rx="10" fill="#f7f7f8"/><path d="M8 24 l-2 8 9 -8z" fill="#f7f7f8"/><text x="17" y="19" text-anchor="middle" font-size="17" font-weight="600" fill="#1b1c1e" font-family="sans-serif">?</text></g>` + star(30, 34, 2.4),
    '',
  ],
  dream: () => [
    `<text x="112" y="34" font-size="12" fill="${GOLD}" font-family="sans-serif" font-weight="600">z</text><text x="122" y="24" font-size="15" fill="${GOLD}" font-family="sans-serif" font-weight="600">Z</text>` + star(30, 30, 2.4),
    `<path d="M36 108 C30 108 28 98 36 96 C36 88 48 86 52 92 C56 84 70 86 70 94 L90 94 C90 86 104 84 108 92 C112 86 124 88 124 96 C132 98 130 108 124 108Z" fill="#e8e2f6" opacity=".9"/>`,
  ],
  tarot: () => [
    star(28, 30, 2.4) + star(134, 26, 2.4),
    `${[-14, 0, 14].map((a, i) => `<g transform="translate(${70 + i * 10} 98) rotate(${a})"><rect x="-8" y="-28" width="16" height="26" rx="2" fill="${i === 1 ? '#2b2560' : '#3a3470'}" stroke="${GOLD}" stroke-width="1.2"/>${star(0, -15, 3.2)}</g>`).join('')}`,
  ],
  psych: () => [
    star(30, 30, 2.4),
    `<g transform="translate(110 70)"><circle r="10" fill="none" stroke="${GOLD}" stroke-width="3"/><path d="M7 7 l9 9" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/><path d="M0 5 C-6 1 -6 -4 -2.6 -4.4 C-1 -4.6 0 -3 0 -2 C0 -3 1 -4.6 2.6 -4.4 C6 -4 6 1 0 5Z" fill="#ff8fa8"/></g>`,
  ],
  name: () => [
    star(30, 30, 2.4),
    `<rect x="60" y="80" width="40" height="20" rx="2" fill="${PAPER}"/><text x="80" y="95" text-anchor="middle" font-size="14" fill="${INK}" font-family="ChosunSm, serif">名</text><g transform="translate(110 70) rotate(30)"><rect x="-2" y="-14" width="4" height="22" rx="1.5" fill="#7a5a22"/><path d="M-3 8 h6 l-3 8z" fill="${INK}"/></g>`,
  ],
  face: () => [
    star(30, 30, 2.4) + star(134, 28, 2),
    `<g transform="translate(112 72)"><circle r="12" fill="${GOLD_D}"/><circle r="9.5" fill="#cfe6ff"/><path d="M-4 -4 a6 6 0 0 1 6 -2" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/><rect x="-2" y="11" width="4" height="12" rx="2" fill="${GOLD_D}"/></g>`,
  ],
};

// 콘텐츠별 표정
const FACES = {
  life: { eyes: 'closed', mouth: 'smile' },
  newyear: { eyes: 'happy', mouth: 'open' },
  tojeong: { eyes: 'smug', mouth: 'smirk', brows: 'firm' },
  today: { eyes: 'dot', mouth: 'open' },
  tomorrow: { eyes: 'wink', mouth: 'smile' },
  date: { eyes: 'dot', mouth: 'flat', brows: 'firm' },
  match: { eyes: 'heart', mouth: 'smile' },
  namematch: { eyes: 'happy', mouth: 'cat' },
  number: { eyes: 'star', mouth: 'open' },
  blessing: { eyes: 'happy', mouth: 'cat' },
  moving: { eyes: 'dot', mouth: 'smile', brows: 'soft' },
  wish: { eyes: 'closed', mouth: 'smile', brows: 'soft' },
  charm: { eyes: 'smug', mouth: 'smirk', brows: 'firm' },
  sal: { eyes: 'dot', mouth: 'flat', brows: 'firm' },
  ask: { eyes: 'dot', mouth: 'o', brows: 'raise' },
  dream: { eyes: 'sleep', mouth: 'o' },
  tarot: { eyes: 'smug', mouth: 'smirk', brows: 'raise' },
  psych: { eyes: 'side', mouth: 'smile', brows: 'soft' },
  name: { eyes: 'closed', mouth: 'cat' },
  face: { eyes: 'wide', mouth: 'o', brows: 'raise' },
};

export function dosaArtSvg(kind) {
  const id = `da-${kind}`;
  const b = base(id, FACES[kind] || {});
  const [back, front] = (PROPS[kind] || (() => ['', '']))();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="12 10 136 102"><defs>${b.defs}</defs>${back}${b.back}${b.body}${b.hands}${front}</svg>`;
}

// 표정을 직접 고른 천둥도사 (평생 사주 로딩 등). face: { eyes, mouth, brows }, propKind: PROPS 의 소품
// 궁합 화면: 성별에 맞는 천둥도사 (male | female)
export function dosaGenderSvg(gender) {
  return dosaFaceSvg(gender === 'female' ? { eyes: 'happy', mouth: 'cat' } : { eyes: 'dot', mouth: 'smile', brows: 'firm' }, gender === 'female' ? 'female' : 'male');
}

export function dosaFaceSvg(face, propKind = '') {
  const id = `df-${face.eyes || 'closed'}-${face.mouth || 'none'}-${propKind || 'x'}`;
  const b = base(id, face);
  const [back, front] = (PROPS[propKind] || (() => ['', '']))();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="12 10 136 102"><defs>${b.defs}</defs>${back}${b.back}${b.body}${b.hands}${front}</svg>`;
}
