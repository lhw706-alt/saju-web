// 빌드 뒤 주소마다 검색·공유용 HTML 을 미리 만든다 (2026-11-14).
// 이 사이트는 화면을 브라우저에서 그려서, 그냥 두면 검색 로봇(특히 네이버)은 모든 주소에서 같은 제목·빈 본문만 본다.
// → dist/<주소>/index.html 에 그 주소의 제목·설명·공유 이미지·대표 주소(canonical)와 짧은 소개 글을 넣어 둔다.
//   Netlify 는 실제 파일이 있으면 그 파일을 먼저 주므로 /lucky 는 dist/lucky/index.html 이 나간다.
//   화면이 뜨면 React 가 #root 안을 새로 그려서 이용자에게는 평소 화면이 보인다.
// 주소·문구를 바꾸면 여기만 고치면 된다 (사이트맵 dist/sitemap.xml 도 여기서 만듦).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { CONTENTS, GROUPS } from '../src/lib/contents.js';
import { SITE } from '../src/site.js';
import { NEXT_YEAR } from '../src/lib/topics.js';
import { GLOSSARY, DICT_SLUG, dictShort } from '../src/lib/glossary.js';

const DIST = new URL('../dist/', import.meta.url);
const base = readFileSync(new URL('index.html', DIST), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// 받침이 있으면 '이란', 없으면 '란' (일간이란 / 지지란)
const ran = (w) => ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? '이란' : '란');

// 모든 소개 글 아래에 붙는 사이트 안 링크 (검색 로봇이 다른 주소도 찾아가게)
const NAV = `<nav aria-label="사이트 메뉴"><ul>
<li><a href="/">무료 사주 풀이</a></li>
<li><a href="/start">내 사주 보기</a></li>
<li><a href="/tti">오늘의 띠별 운세</a></li>
<li><a href="/name-match">이름 궁합</a></li>
<li><a href="/newyear">신년운세</a></li>
<li><a href="/lucky">행운의 번호</a></li>
<li><a href="/charms">부적 도감</a></li>
<li><a href="/dict">사주 용어 사전</a></li>
<li><a href="/terms">이용약관</a></li>
<li><a href="/privacy">개인정보 처리방침</a></li>
</ul></nav>`;

const live = CONTENTS.filter((c) => c.status === 'live');
const homeList = GROUPS.map((g) => {
  const items = live.filter((c) => c.group === g.id);
  if (!items.length) return '';
  return `<h2>${esc(g.label)}</h2><ul>${items.map((c) => `<li><a href="${c.path || '/start'}"><strong>${esc(c.title)}</strong></a> — ${esc(c.desc)}</li>`).join('')}</ul>`;
}).join('');

const ROUTES = [
  {
    path: '/',
    title: `${SITE.name} — 무료 사주 풀이·신년운세·만세력`,
    desc: '생년월일시로 사주 원국·오행·대운을 계산하고, 영험한 천둥도사가 근거와 함께 풀어 드려요. 평생 사주, 신년운세, 오늘·내일 운세, 띠 운세, 궁합, 행운의 번호까지 무료예요.',
    body: `<h1>${SITE.name} — 궁금한 건 천둥도사에게 물어봐요</h1>
<p>생년월일시만 알려 주면 만세력으로 사주 원국(여덟 글자)과 오행, 대운을 계산하고, 천둥도사가 근거와 함께 풀어 드려요. 회원 가입 없이도 무료로 볼 수 있어요.</p>${homeList}`,
  },
  {
    path: '/start',
    title: `내 사주 보기 — 생년월일시로 보는 무료 사주 | ${SITE.name}`,
    desc: '성별, 생년월일, 태어난 시각, 태어난 곳만 알려 주면 천둥도사가 사주 원국과 대운을 계산해 풀어 드려요. 양력·음력 모두 돼요.',
    body: `<h1>내 사주 보기</h1>
<p>성별 → 생년월일 → 태어난 시각 → 태어난 곳 순서로 입력하면 사주 원국(여덟 글자), 오행 분포, 10년마다 바뀌는 대운을 바로 계산해요. 태어난 시각을 몰라도 볼 수 있어요.</p>
<p>이름과 연락처는 받지 않아요.</p>`,
  },
  {
    path: '/lucky',
    title: `행운의 번호 — 천둥도사가 뽑아 주는 오늘의 로또 번호 6개 | ${SITE.name}`,
    desc: '천둥도사를 누르면 1부터 45까지 오늘의 행운 번호 여섯 개를 뽑아 드려요. 하루에 한 번, 같은 날엔 같은 번호예요. 친구에게 공유할 수도 있어요.',
    image: '/share-fortune.png',
    body: `<h1>행운의 번호</h1>
<p>네잎클로버를 든 천둥도사를 누르면 번호 공이 빙글빙글 돌다가 1부터 45 사이의 행운 번호 여섯 개를 뽑아 드려요.</p>
<ul><li>하루에 한 번만 뽑을 수 있고, 다시 열어도 그날 뽑은 번호가 그대로 보여요.</li><li>카카오톡이나 링크로 친구에게 나눌 수 있어요.</li><li>재미로 보는 번호예요. 당첨을 약속하지는 않아요.</li></ul>`,
  },
  {
    path: '/name-match',
    title: `이름 궁합 — 이름 두 개로 알아보는 우리 사이의 케미 | ${SITE.name}`,
    desc: '이름만 넣으면 바로 보는 무료 이름 궁합. 이름 글자의 소리 오행으로 두 사람의 종합 점수, 성격·대화·감정 궁합, 관계 유형, 누가 먼저 다가갈지까지 천둥도사가 풀어 드려요.',
    body: `<h1>이름 궁합</h1><p>이름 두 개와 두 사람의 관계(연인·썸·친구·부부·동료)만 넣으면 바로 시작해요. 이름 글자마다 첫소리로 소리 오행(목·화·토·금·수)을 찾아 두 이름이 어떻게 어울리는지 풀어 드려요.</p><ul><li>종합 궁합 점수와 관계 유형</li><li>성격·대화·감정 궁합과 관계 지속력</li><li>누가 먼저 다가갈까, 오래 가는 법</li></ul><p>생년월일시로 보는 사주 궁합도 함께 볼 수 있어요.</p>`,
  },
  {
    path: '/tti',
    title: `오늘의 띠별 운세 — 12띠 나이별 운세 무료 | ${SITE.name}`,
    desc: '쥐띠부터 돼지띠까지 12띠의 오늘 운세와 나이별 운세, 행운의 색·숫자·방향을 매일 천둥도사가 풀어 드려요. 입력 없이 바로 볼 수 있어요.',
    body: `<h1>오늘의 띠별 운세</h1><p>쥐띠부터 돼지띠까지 12띠의 오늘 운세와 나이별 운세, 행운의 색·숫자·방향을 매일 천둥도사가 풀어 드려요. 생년월일을 넣지 않아도 바로 볼 수 있어요.</p>`,
  },
  {
    path: '/newyear',
    title: `${NEXT_YEAR} 무료 신년운세 — 내 사주로 보는 한 해의 흐름 | ${SITE.name}`,
    desc: `${NEXT_YEAR}년 신년운세를 무료로 봐요. 내 사주 원국과 ${NEXT_YEAR}년의 기운을 맞춰 한 해의 흐름, 계절별 운, 일·돈·관계를 천둥도사가 근거와 함께 풀어 드려요.`,
    body: `<h1>${NEXT_YEAR} 무료 신년운세</h1>
<p>천둥도사가 내 사주와 ${NEXT_YEAR}년의 기운을 맞춰 보고, 한 해의 흐름과 봄·여름·가을·겨울 계절마다 운을 풀어 드려요. 회원 가입 없이 무료로 볼 수 있어요.</p>
<h2>이런 걸 알려 드려요</h2><ul><li>한 해의 큰 흐름</li><li>계절별 운</li><li>일·돈·관계</li><li>생활 습관</li></ul>
<h2>자주 묻는 질문</h2><p>태어난 시간을 몰라도 볼 수 있고, 양력·음력(윤달 포함) 모두 넣을 수 있어요. 이름과 연락처는 받지 않아요.</p>`,
  },
  {
    path: '/charms',
    title: `부적 도감 — 매일 펼치는 오늘의 운세 부적 21종 | ${SITE.name}`,
    desc: '하루 한 장 오늘의 운세 부적을 펼치고 21종 부적을 모아 보세요. 매일 출석하듯 모으는 천둥도사의 부적 도감이에요.',
    image: '/share-fortune.png',
    body: `<h1>부적 도감</h1>
<p>오른쪽 아래 '오늘의 운세' 부적을 하루 한 장 펼치면 부적이 도감에 모여요. 모두 21종이고, 며칠 연속으로 모았는지도 보여 드려요.</p>`,
  },
  {
    path: '/terms',
    title: `이용약관 | ${SITE.name}`,
    desc: `${SITE.name} 서비스 이용약관이에요. 서비스 내용, 풀이의 성격, 회원 가입과 탈퇴, 이용자의 의무를 안내해요.`,
    body: `<h1>이용약관</h1><p>${SITE.name} 서비스를 이용하는 데 필요한 서비스와 이용자의 권리, 의무, 책임을 정해요. 시행일: 2026년 11월 14일.</p>`,
  },
  {
    path: '/privacy',
    title: `개인정보 처리방침 | ${SITE.name}`,
    desc: `${SITE.name}이(가) 처리하는 개인정보와 보관 기간, 위탁 업체, 이용자의 권리를 안내해요.`,
    body: `<h1>개인정보 처리방침</h1><p>${SITE.name}은(는) 회원으로 가입하지 않아도 사주·운세 풀이를 볼 수 있고, 사주 풀이에는 이름과 연락처를 받지 않아요. 시행일: 2026년 11월 14일.</p>`,
  },
  // 사주 용어 사전: 목록 + 용어마다 한 페이지 ("일간이란?" 같은 검색용)
  {
    path: '/dict',
    title: `사주 용어 사전 — 일간·오행·십성·대운 쉽게 알기 | ${SITE.name}`,
    desc: '사주 원국, 일간, 오행, 십성, 대운, 세운처럼 사주 풀이에 나오는 말을 처음 보는 사람도 알기 쉽게 풀었어요.',
    body: `<h1>사주 용어 사전</h1><p>사주 풀이에 나오는 말을 처음 보는 사람도 알기 쉽게 풀었어요.</p><ul>${Object.keys(DICT_SLUG).map((t) => `<li><a href="/dict/${DICT_SLUG[t]}">${esc(GLOSSARY[t].title)}</a></li>`).join('')}</ul>`,
  },
  ...Object.keys(DICT_SLUG).map((t) => {
    const g = GLOSSARY[t];
    return {
      path: `/dict/${DICT_SLUG[t]}`,
      title: `${t}${ran(t)}? ${dictShort(t)} — 사주 용어 풀이 | ${SITE.name}`,
      desc: g.body.join(' ').slice(0, 150),
      body: `<h1>${esc(g.title)}</h1>${g.body.map((p) => `<p>${esc(p)}</p>`).join('')}${(g.related || []).filter((r) => DICT_SLUG[r]).length ? `<h2>함께 보면 좋은 말</h2><ul>${g.related.filter((r) => DICT_SLUG[r]).map((r) => `<li><a href="/dict/${DICT_SLUG[r]}">${esc(r)}</a></li>`).join('')}</ul>` : ''}<p><a href="/dict">사주 용어 사전 전체 보기</a></p>`,
    };
  }),
  // 개인 결과·계정 화면: 검색에 올리지 않음 (robots.txt 와 함께)
  { path: '/result', title: `사주 풀이 결과 | ${SITE.name}`, noindex: true },
  { path: '/my', title: `마이페이지 | ${SITE.name}`, noindex: true },
  { path: '/admin', title: `관리자 | ${SITE.name}`, noindex: true },
  { path: '/reset', title: `비밀번호 재설정 | ${SITE.name}`, noindex: true },
];

const DEFAULT_DESC = '생년월일시로 사주 원국·오행·대운을 계산하고, 영험한 천둥도사가 근거와 함께 풀어 드려요.';

function render(r) {
  const url = SITE.url + (r.path === '/' ? '/' : r.path);
  const desc = r.desc || DEFAULT_DESC;
  const img = SITE.url + (r.image || '/share-saju.png');
  let html = base
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(r.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(desc)}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(r.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(desc)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${esc(url)}" />`);
  const extra = [
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(img)}" />`,
    '<meta property="og:image:width" content="800" />',
    '<meta property="og:image:height" content="400" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    r.noindex ? '<meta name="robots" content="noindex, nofollow" />' : '',
    r.path === '/'
      ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, alternateName: SITE.hanja, url: SITE.url + '/', inLanguage: 'ko-KR', description: desc })}</script>`
      : '',
  ].filter(Boolean);
  html = html.replace('</head>', `    ${extra.join('\n    ')}\n  </head>`);
  if (r.body) html = html.replace('<div id="root"></div>', `<div id="root"><main class="prerender">${r.body}${NAV}</main></div>`);
  return html;
}

for (const r of ROUTES) {
  const html = render(r);
  if (r.path === '/') writeFileSync(new URL('index.html', DIST), html);
  else {
    const dir = new URL(`.${r.path}/`, DIST);
    mkdirSync(dir, { recursive: true });
    writeFileSync(new URL('index.html', dir), html);
    writeFileSync(new URL(`.${r.path}.html`, DIST), html); // /lucky 와 /lucky/ 어느 쪽으로 와도 같은 파일
  }
}
// 사이트맵: 검색에 올릴 주소 전부 (noindex 제외). public/sitemap.xml 대신 빌드 때 새로 씀
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const urls = ROUTES.filter((r) => !r.noindex).map((r) => `  <url><loc>${SITE.url}${r.path === '/' ? '/' : r.path}</loc>${r.path === '/tti' || r.path === '/' ? `<lastmod>${today}</lastmod><changefreq>daily</changefreq>` : ''}</url>`);
writeFileSync(new URL('sitemap.xml', DIST), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`);
console.log(`prerender: ${ROUTES.length}개 주소의 검색·공유용 HTML 을 만들었어요.`);
