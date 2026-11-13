// 십이지신 캐릭터 (2026-11-13 사용자 요청: 띠 운세에는 천둥도사 대신 내 띠 동물)
// 모두 같은 틀: 큰 머리 + 앉은 몸(2등신), 둥근 눈, 볼 터치. 동물마다 귀·뿔·주둥이·무늬·색만 다름.
// zodiacSvg(animal, mood) — animal: saju.js 의 띠 이름(쥐·소·호랑이…), mood: 'great' | 'good' | 'calm'

const INK = '#2b2530';
const CHEEK = 'rgba(255,128,140,0.45)';

// 동물별 설정: main(몸·머리), sub(배·주둥이), back(머리 뒤 그림), front(얼굴 위 그림), muzzle(주둥이 모양), eyeY
const ANIMALS = {
  쥐: {
    main: '#b9b6c9',
    sub: '#e9e6f2',
    back: `<circle cx="32" cy="30" r="15" fill="#b9b6c9"/><circle cx="32" cy="30" r="9" fill="#f3b4c0"/><circle cx="88" cy="30" r="15" fill="#b9b6c9"/><circle cx="88" cy="30" r="9" fill="#f3b4c0"/>
      <path d="M86 98 q22 4 20 -14 q-1 -8 6 -10" stroke="#f3b4c0" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    front: `<ellipse cx="60" cy="68" rx="3.4" ry="2.6" fill="#f08aa0"/>
      <path d="M44 68 h-12 M44 72 l-11 3 M76 68 h12 M76 72 l11 3" stroke="#8d88a3" stroke-width="1.3" stroke-linecap="round"/>`,
  },
  소: {
    main: '#c79a6c',
    sub: '#f1dcc0',
    back: `<path d="M34 34 q-14 -6 -12 -20 q8 10 18 10z" fill="#f4ead8" stroke="#d9c7a6" stroke-width="1"/><path d="M86 34 q14 -6 12 -20 q-8 10 -18 10z" fill="#f4ead8" stroke="#d9c7a6" stroke-width="1"/>
      <ellipse cx="27" cy="46" rx="10" ry="5.5" fill="#c79a6c" transform="rotate(-20 27 46)"/><ellipse cx="93" cy="46" rx="10" ry="5.5" fill="#c79a6c" transform="rotate(20 93 46)"/>`,
    front: `<ellipse cx="60" cy="72" rx="17" ry="11" fill="#f1dcc0"/><ellipse cx="53.5" cy="72" rx="2.2" ry="3" fill="#9a6e45"/><ellipse cx="66.5" cy="72" rx="2.2" ry="3" fill="#9a6e45"/>
      <path d="M50 30 q10 -6 20 0 q-10 6 -20 0z" fill="#a87c52"/>`,
    eyeY: 54,
  },
  호랑이: {
    main: '#f0a14a',
    sub: '#fff3e2',
    back: `<circle cx="34" cy="31" r="11" fill="#f0a14a"/><circle cx="34" cy="31" r="6" fill="#fff3e2"/><circle cx="86" cy="31" r="11" fill="#f0a14a"/><circle cx="86" cy="31" r="6" fill="#fff3e2"/>`,
    front: `<path d="M52 30 h16 M54 36 h12 M60 28 v10" stroke="#3a2a22" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M30 50 l8 2 M29 58 l8 0 M90 50 l-8 2 M91 58 l-8 0" stroke="#3a2a22" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="60" cy="70" rx="13" ry="8.5" fill="#fff3e2"/><path d="M57 67 h6 l-3 3z" fill="#e0707f"/>`,
  },
  토끼: {
    main: '#f3eee8',
    sub: '#ffffff',
    back: `<ellipse cx="45" cy="16" rx="8.5" ry="22" fill="#f3eee8" transform="rotate(-10 45 16)"/><ellipse cx="45" cy="17" rx="4.2" ry="16" fill="#f6b8c6" transform="rotate(-10 45 17)"/>
      <ellipse cx="75" cy="16" rx="8.5" ry="22" fill="#f3eee8" transform="rotate(10 75 16)"/><ellipse cx="75" cy="17" rx="4.2" ry="16" fill="#f6b8c6" transform="rotate(10 75 17)"/>`,
    front: `<path d="M57.5 67 h5 l-2.5 3z" fill="#f08aa0"/>`,
  },
  용: {
    main: '#6cc3a2',
    sub: '#e6f6df',
    back: `<path d="M44 30 l-6 -18 l8 8 l2 -10 l4 16z" fill="#e2c27a"/><path d="M76 30 l6 -18 l-8 8 l-2 -10 l-4 16z" fill="#e2c27a"/>
      <path d="M28 44 l-10 -4 l6 8 l-8 2 l12 4z M92 44 l10 -4 l-6 8 l8 2 l-12 4z" fill="#4fa587"/>`,
    front: `<ellipse cx="60" cy="71" rx="14" ry="9" fill="#e6f6df"/><circle cx="55" cy="69" r="1.6" fill="#3d8a70"/><circle cx="65" cy="69" r="1.6" fill="#3d8a70"/>
      <path d="M46 72 q-12 2 -16 12 M74 72 q12 2 16 12" stroke="#e2c27a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  },
  뱀: {
    main: '#97c96a',
    sub: '#eef6d8',
    body: `<ellipse cx="60" cy="104" rx="34" ry="10" fill="#7fb456"/><ellipse cx="60" cy="96" rx="27" ry="9" fill="#97c96a"/><ellipse cx="60" cy="89" rx="19" ry="7" fill="#7fb456"/>
      <path d="M40 104 q4 -3 8 0 M56 106 q4 -3 8 0 M72 104 q4 -3 8 0" stroke="#e2c27a" stroke-width="1.6" fill="none"/>`,
    back: '',
    front: `<path d="M60 72 v6 l-3 3 M60 78 l3 3" stroke="#e0707f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <circle cx="52" cy="34" r="3" fill="#7fb456"/><circle cx="60" cy="31" r="3" fill="#7fb456"/><circle cx="68" cy="34" r="3" fill="#7fb456"/>`,
  },
  말: {
    main: '#b67b4c',
    sub: '#ecd2b6',
    back: `<path d="M36 34 l-4 -20 l14 12z" fill="#b67b4c"/><path d="M84 34 l4 -20 l-14 12z" fill="#b67b4c"/>
      <path d="M48 26 q12 -14 26 -4 q-4 10 -8 12 q-8 -6 -18 -8z" fill="#4a3226"/>`,
    front: `<ellipse cx="60" cy="72" rx="15" ry="10.5" fill="#ecd2b6"/><ellipse cx="54.5" cy="73" rx="2" ry="2.8" fill="#8a5a36"/><ellipse cx="65.5" cy="73" rx="2" ry="2.8" fill="#8a5a36"/>`,
    eyeY: 54,
  },
  양: {
    main: '#f6efe2',
    sub: '#e9d6bb',
    back: `<g fill="#f6efe2"><circle cx="34" cy="38" r="12"/><circle cx="44" cy="26" r="12"/><circle cx="60" cy="22" r="13"/><circle cx="76" cy="26" r="12"/><circle cx="86" cy="38" r="12"/><circle cx="30" cy="54" r="11"/><circle cx="90" cy="54" r="11"/></g>
      <path d="M30 48 q-10 2 -8 12 q4 6 9 1" stroke="#c9a77a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M90 48 q10 2 8 12 q-4 6 -9 1" stroke="#c9a77a" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    face: '#e9d6bb',
    front: `<path d="M57.5 68 h5 l-2.5 3z" fill="#a77c58"/>`,
  },
  원숭이: {
    main: '#a8744a',
    sub: '#f2cfae',
    back: `<circle cx="26" cy="56" r="11" fill="#a8744a"/><circle cx="26" cy="56" r="6.5" fill="#f2cfae"/><circle cx="94" cy="56" r="11" fill="#a8744a"/><circle cx="94" cy="56" r="6.5" fill="#f2cfae"/>
      <path d="M86 100 q20 2 18 -16 q-2 -8 4 -10" stroke="#a8744a" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    front: `<path d="M60 46 q-8 -8 -16 -2 q-8 6 -4 16 q-4 14 20 18 q24 -4 20 -18 q4 -10 -4 -16 q-8 -6 -16 2z" fill="#f2cfae"/>
      <circle cx="57.5" cy="66" r="1.2" fill="#8a5a36"/><circle cx="62.5" cy="66" r="1.2" fill="#8a5a36"/>`,
  },
  닭: {
    main: '#fbf6ec',
    sub: '#ffffff',
    back: `<path d="M50 30 q-4 -14 6 -12 q2 -10 10 -4 q8 -4 8 6 q8 2 2 12z" fill="#e8505b"/>
      <path d="M28 92 q-10 -6 -6 -18 q6 6 10 8z M92 92 q10 -6 6 -18 q-6 6 -10 8z" fill="#f1e6d0"/>`,
    front: `<path d="M54 64 l6 -4 l6 4 l-6 6z" fill="#f5b83f"/><path d="M57 70 q3 8 6 0z" fill="#e8505b"/>`,
  },
  개: {
    main: '#dba86c',
    sub: '#f7e8d2',
    back: `<path d="M34 30 q-16 4 -12 30 q10 2 16 -10z" fill="#8f5e34"/><path d="M86 30 q16 4 12 30 q-10 2 -16 -10z" fill="#8f5e34"/>`,
    front: `<ellipse cx="60" cy="71" rx="13" ry="9" fill="#f7e8d2"/><ellipse cx="60" cy="67" rx="4" ry="3" fill="#3a2a22"/><path d="M60 70 v3 q-3 3 -5 1 M60 73 q3 3 5 1" stroke="#3a2a22" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <ellipse cx="72" cy="48" rx="7" ry="6" fill="#c38f55"/>`,
  },
  돼지: {
    main: '#f3b2bb',
    sub: '#fbd6db',
    back: `<path d="M36 34 l-6 -16 l16 8z" fill="#e894a1"/><path d="M84 34 l6 -16 l-16 8z" fill="#e894a1"/>`,
    front: `<ellipse cx="60" cy="69" rx="10" ry="7" fill="#e894a1"/><ellipse cx="56.5" cy="69" rx="2" ry="2.8" fill="#b9606f"/><ellipse cx="63.5" cy="69" rx="2" ry="2.8" fill="#b9606f"/>`,
  },
};

const EYES = {
  great: (y) => `<path d="M43 ${y + 1} q5 -6 10 0 M67 ${y + 1} q5 -6 10 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  good: (y) => `<circle cx="48" cy="${y}" r="3.6" fill="${INK}"/><circle cx="72" cy="${y}" r="3.6" fill="${INK}"/><circle cx="49.3" cy="${y - 1.4}" r="1.2" fill="#fff"/><circle cx="73.3" cy="${y - 1.4}" r="1.2" fill="#fff"/>`,
  calm: (y) => `<path d="M43 ${y} q5 4 10 0 M67 ${y} q5 4 10 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
};
const MOUTH = {
  great: '<path d="M55 80 q5 6 10 0z" fill="#c9505e"/>',
  good: `<path d="M55 79 q5 4 10 0" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  calm: `<path d="M56 80 h8" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
};

export const ZODIAC_ANIMALS = Object.keys(ANIMALS);

export function zodiacSvg(animal, mood = 'good') {
  const a = ANIMALS[animal] || ANIMALS.쥐;
  const m = EYES[mood] ? mood : 'good';
  const eyeY = a.eyeY || 57;
  const body =
    a.body ||
    `<ellipse cx="60" cy="100" rx="25" ry="15" fill="${a.main}"/><ellipse cx="60" cy="102" rx="14" ry="9" fill="${a.sub}"/>
     <ellipse cx="45" cy="108" rx="7" ry="4.5" fill="${a.main}"/><ellipse cx="75" cy="108" rx="7" ry="4.5" fill="${a.main}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -8 120 128">
    <ellipse cx="60" cy="114" rx="30" ry="4" fill="rgba(0,0,0,0.28)"/>
    ${a.back}
    ${body}
    <circle cx="60" cy="56" r="31" fill="${a.face || a.main}"/>
    ${a.front}
    ${EYES[m](eyeY)}
    <ellipse cx="40" cy="${eyeY + 9}" rx="5" ry="3" fill="${CHEEK}"/><ellipse cx="80" cy="${eyeY + 9}" rx="5" ry="3" fill="${CHEEK}"/>
    ${a.body ? '' : MOUTH[m]}
  </svg>`;
}

// 점수 → 표정
export const zodiacMood = (score) => (score >= 85 ? 'great' : score >= 60 ? 'good' : 'calm');
