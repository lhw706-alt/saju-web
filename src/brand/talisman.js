// 행운의 부적 그림·내용 (2026-11-14 사용자 기획안). 전통 부적의 모양(노란 종이·붉은 글씨·인장)을 빌린 창작 디자인.
// talismanSvg(kind, { text }) — text:false 면 한자 없이 종이·테두리·무늬만 (이미지 저장 때 한자는 캔버스에 조선신명조로 따로 씀).
// 내용(TALISMANS)은 상징을 풀어 쓴 창작 글 — 실제 효과를 약속하는 말은 쓰지 않는다.

export const TALISMANS = [
  {
    id: 'money',
    cheer: '당신의 풍요로운 내일을 응원해요',
    han: '財',
    name: '금전운 상승 부적',
    short: '돈과 풍요를 부르는 행운',
    meaning: '재물 재(財) 자를 가운데 두고 금빛 동전 무늬로 풍요와 넉넉함을 상징했어요.',
    forWho: '경제적인 안정과 새로운 기회를 바라는 사람',
    use: '지갑 사진 옆이나 휴대폰 배경화면에 두고, 돈을 쓸 때 한 번 더 생각하는 습관과 함께해 보세요.',
    accent: '#c99a2e',
  },
  {
    id: 'love',
    cheer: '당신의 따뜻한 인연을 응원해요',
    han: '緣',
    name: '좋은 인연 부적',
    short: '좋은 인연과 따뜻한 사랑',
    meaning: '인연 연(緣) 자와 이어진 붉은 실 무늬로 사람과 사람 사이의 고운 연결을 상징했어요.',
    forWho: '새로운 인연을 기다리거나 지금의 관계를 더 아끼고 싶은 사람',
    use: '배경화면으로 두고 소중한 사람에게 먼저 안부를 건네 보세요.',
    accent: '#d2373d',
  },
  {
    id: 'career',
    cheer: '당신의 새로운 출발을 응원해요',
    han: '業',
    name: '취업 성공 부적',
    short: '원하는 목표와 합격',
    meaning: '일 업(業) 자와 위로 뻗는 계단 무늬로 한 걸음씩 목표에 다가가는 마음을 상징했어요.',
    forWho: '취업·이직·승진처럼 일의 새 출발을 준비하는 사람',
    use: '면접이나 시험 전에 한 번 보고, 준비한 것을 차분히 떠올리는 신호로 써 보세요.',
    accent: '#2f6fb0',
  },
  {
    id: 'health',
    cheer: '당신의 평온한 하루를 응원해요',
    han: '康',
    name: '건강 평안 부적',
    short: '건강과 평온한 일상',
    meaning: '편안할 강(康) 자와 잔잔한 물결 무늬로 몸과 마음이 고르게 쉬는 하루를 상징했어요.',
    forWho: '바쁜 일상 속에서 쉼과 평온이 필요한 사람',
    use: '잠들기 전 배경화면으로 보고, 물 한 잔과 가벼운 스트레칭을 챙기는 신호로 써 보세요.',
    accent: '#2f8f5a',
  },
  {
    id: 'study',
    cheer: '당신의 꾸준한 배움을 응원해요',
    han: '學',
    name: '학업 성취 부적',
    short: '시험과 공부의 결실',
    meaning: '배울 학(學) 자와 펼친 책 무늬로 꾸준히 쌓아 가는 배움을 상징했어요.',
    forWho: '시험·자격증·새로운 공부를 앞둔 사람',
    use: '공부를 시작하기 전에 한 번 보고, 오늘 할 분량을 정하는 습관과 함께해 보세요.',
    accent: '#6a4bb0',
  },
  {
    id: 'luck',
    cheer: '당신의 모든 일이 술술 풀리길 응원해요',
    han: '通',
    name: '만사형통 부적',
    short: '전반적인 행운과 순조로움',
    meaning: '통할 통(通) 자와 사방으로 뻗는 빛 무늬로 막힘없이 풀려 가는 흐름을 상징했어요.',
    forWho: '특별히 바라는 한 가지보다 두루 좋은 기운이 필요한 사람',
    use: '새 일을 시작하는 날 배경화면으로 두고 가벼운 마음으로 출발해 보세요.',
    accent: '#b8862b',
  },
];
export const talismanById = (id) => TALISMANS.find((t) => t.id === id) || null;

// 오늘의 행운 부적: 날짜마다 하나 (모두에게 같음)
export function todayTalisman(d = new Date()) {
  const k = d.getFullYear() * 400 + (d.getMonth() + 1) * 31 + d.getDate();
  return TALISMANS[k % TALISMANS.length];
}

// 종류마다 다른 무늬 (붉은 먹 선, 좌표 200×300)
const PATTERN = {
  money: `<g fill="none" stroke="#b3262c" stroke-width="2.4">${[70, 130].map((x) => `<circle cx="${x}" cy="248" r="14"/><rect x="${x - 5}" y="243" width="10" height="10"/>`).join('')}</g>`,
  love: `<path d="M40 238 C70 214 90 266 120 240 S170 222 160 250" fill="none" stroke="#b3262c" stroke-width="2.6" stroke-linecap="round"/><path d="M100 262 c-9 -7 -9 -14 -3 -15 c2 0 3 2 3 3 c0 -1 1 -3 3 -3 c6 1 6 8 -3 15z" fill="#b3262c"/>`,
  career: `<path d="M50 266 h24 v-12 h24 v-12 h24 v-12 h24" fill="none" stroke="#b3262c" stroke-width="2.6" stroke-linejoin="round"/><path d="M146 230 l0 -10 l8 5z" fill="#b3262c"/>`,
  health: `<g fill="none" stroke="#b3262c" stroke-width="2.4" stroke-linecap="round">${[240, 254].map((y) => `<path d="M40 ${y} q15 -10 30 0 t30 0 t30 0 t30 0"/>`).join('')}</g>`,
  study: `<g fill="none" stroke="#b3262c" stroke-width="2.4" stroke-linejoin="round"><path d="M100 232 c-18 -8 -36 -8 -50 0 v30 c14 -8 32 -8 50 0z"/><path d="M100 232 c18 -8 36 -8 50 0 v30 c-14 -8 -32 -8 -50 0z"/></g>`,
  luck: `<g stroke="#b3262c" stroke-width="2.4" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 -14 V-24" transform="translate(100 248) rotate(${a})"/>`).join('')}</g><circle cx="100" cy="248" r="8" fill="none" stroke="#b3262c" stroke-width="2.4"/>`,
};

export function talismanSvg(kind, { text = true } = {}) {
  const t = talismanById(kind) || TALISMANS[5];
  const id = `tal-${t.id}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300">
  <defs>
    <linearGradient id="${id}-p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8e3a0"/><stop offset=".55" stop-color="#efcf78"/><stop offset="1" stop-color="#e3b85a"/></linearGradient>
    <radialGradient id="${id}-g" cx="50%" cy="42%" r="55%"><stop offset="0" stop-color="${t.accent}" stop-opacity=".28"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect x="2" y="2" width="196" height="296" rx="10" fill="url(#${id}-p)"/>
  <rect x="2" y="2" width="196" height="296" rx="10" fill="url(#${id}-g)"/>
  <rect x="12" y="12" width="176" height="276" rx="6" fill="none" stroke="#b3262c" stroke-width="3"/>
  <rect x="19" y="19" width="162" height="262" rx="4" fill="none" stroke="#b3262c" stroke-width="1.2"/>
  <path d="M30 70 Q100 52 170 70" fill="none" stroke="#b3262c" stroke-width="1.6"/>
  <path d="M40 206 Q100 222 160 206" fill="none" stroke="#b3262c" stroke-width="1.6"/>
  ${PATTERN[t.id] || ''}
  <circle cx="160" cy="44" r="13" fill="#c8373d"/><circle cx="160" cy="44" r="10" fill="none" stroke="#f8e3a0" stroke-width="1"/>
  ${
    text
      ? `<text x="100" y="52" text-anchor="middle" font-family="ChosunSm, serif" font-size="17" fill="#8c1d22" letter-spacing="6">天文</text>
  <text x="100" y="168" text-anchor="middle" font-family="ChosunSm, serif" font-size="104" fill="#a8212a">${t.han}</text>
  <text x="160" y="49" text-anchor="middle" font-family="ChosunSm, serif" font-size="12" fill="#f8e3a0">福</text>`
      : ''
  }
</svg>`;
}

// 이미지 저장: 종이·무늬는 SVG 로, 한자는 화면에 올라온 조선신명조로 캔버스에 그림 (SVG 그림 안에서는 웹 서체를 못 씀)
// mode: 'card'(1080×1620 부적만) | 'wallpaper'(1080×2340 휴대폰 배경화면, 어두운 밤하늘 + 부적 + 이름)
export async function talismanPng(kind, mode = 'card') {
  const t = talismanById(kind) || TALISMANS[5];
  const W = 1080;
  const H = mode === 'wallpaper' ? 2340 : 1620;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  await document.fonts?.load('80px "ChosunSm"', t.han + '天文福').catch(() => {});
  // 배경
  if (mode === 'wallpaper') {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#14151a');
    bg.addColorStop(1, '#1f1a12');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(255,236,190,${0.15 + ((i * 37) % 60) / 100})`;
      g.beginPath();
      g.arc((i * 173) % W, (i * 311) % H, 1 + (i % 3), 0, Math.PI * 2);
      g.fill();
    }
    const glow = g.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, W * 0.7);
    glow.addColorStop(0, 'rgba(226,194,122,0.28)');
    glow.addColorStop(1, 'rgba(226,194,122,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);
  } else {
    g.fillStyle = '#1b1c1e';
    g.fillRect(0, 0, W, H);
  }
  // 부적 (200×300 비율)
  const tw = mode === 'wallpaper' ? 640 : 900;
  const th = tw * 1.5;
  const tx = (W - tw) / 2;
  const ty = mode === 'wallpaper' ? (H - th) / 2 - 60 : (H - th) / 2;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(talismanSvg(t.id, { text: false }))}`;
  await img.decode();
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.45)';
  g.shadowBlur = 40;
  g.shadowOffsetY = 16;
  g.drawImage(img, tx, ty, tw, th);
  g.restore();
  const k = tw / 200;
  g.textAlign = 'center';
  g.fillStyle = '#8c1d22';
  g.font = `${17 * k}px ChosunSm, serif`;
  g.fillText('天 文', tx + 100 * k, ty + 52 * k);
  g.fillStyle = '#a8212a';
  g.font = `${104 * k}px ChosunSm, serif`;
  g.fillText(t.han, tx + 100 * k, ty + 168 * k);
  g.fillStyle = '#f8e3a0';
  g.font = `${12 * k}px ChosunSm, serif`;
  g.fillText('福', tx + 160 * k, ty + 49 * k);
  if (mode === 'wallpaper') {
    g.fillStyle = '#e2c27a';
    g.font = '600 52px Pretendard, sans-serif';
    g.fillText(t.name, W / 2, ty + th + 120);
    g.fillStyle = 'rgba(232,233,236,0.7)';
    g.font = '36px Pretendard, sans-serif';
    g.fillText('사주천문 · 행운의 부적', W / 2, ty + th + 184);
  }
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
