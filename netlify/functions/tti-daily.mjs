// 오늘의 띠별 운세 (2026-11-14) — 입력 없이 누구나 보는 12띠 오늘 운세.
// - GET /api/tti-daily : 오늘(KST) 12띠 운세 JSON. 하루 한 번만 만들어 Netlify Blobs 'daily'(키 tti/날짜)에 두고 모두에게 같은 글을 줌.
//   처음 부른 사람이 만들고(4띠씩 3번 동시에 요청 — 55초 안에), 만드는 동안 다른 사람에게는 { status: 'pending' } → 화면이 3초마다 다시 물음.
// - GET /tti : 검색 로봇용. 미리 만든 화면 틀(/tti.html)에 오늘 운세 글을 넣어 돌려줌(네이버 로봇도 글을 읽게). 아직 없으면 틀만.
// 생년월일 같은 개인 정보는 받지 않음. 풀이 금지 사항은 SYSTEM 에.
import Anthropic from '@anthropic-ai/sdk';
import { getStore } from '@netlify/blobs';
import lunar from 'lunar-javascript';
import { ttiYears } from '../../src/lib/topics.js';
import { json, createRateLimiter } from '../lib/guard.mjs';

const { Solar } = lunar;
const MODEL = process.env.SAJU_MODEL || 'claude-opus-5-5';
const TIME_LIMIT_MS = 50_000;
const PENDING_STALE_MS = 75_000; // 만드는 중 표시가 이보다 오래되면 다시 만듦
export const TTI_ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
const BRANCH = { 쥐: '子', 소: '丑', 호랑이: '寅', 토끼: '卯', 용: '辰', 뱀: '巳', 말: '午', 양: '未', 원숭이: '申', 닭: '酉', 개: '戌', 돼지: '亥' };
const KO = { 甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계', 子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해' };
const COLORS = '빨간색·주황색·노란색·초록색·하늘색·파란색·남색·보라색·분홍색·흰색·검은색·회색·갈색·금색·은색·베이지색';
const DIRS = '동·서·남·북·동북·동남·남서·북서';

const SYSTEM = `당신은 한국어로 띠별 운세를 쓰는 사주명리 해설가입니다. 서버가 계산한 그날의 일진(日辰)과 각 띠의 지지만 보고 씁니다.
- 따뜻하고 차분한 해요체. 단정 대신 경향("~하기 좋아요", "~해 보세요").
- 각 띠의 지지와 그날 일진 지지의 관계(육합·삼합·충·형·파·해·원진)를 바탕으로 쓰되, 용어는 쓰지 않거나 쉽게 풀어 씁니다.
- 죽음·사고·질병·이혼 같은 겁주는 예언, 투자 종목·도박 권유, 부적·굿·유료 상담 권유는 쓰지 않습니다.
- 출력은 JSON 하나만. 설명·코드블록 표시 없이.`;

const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const store = () => getStore({ name: 'daily', consistency: 'strong' });
const limited = createRateLimiter(30);

function dayInfo(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const gz = Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi();
  return { ganzhi: gz, ko: [...gz].map((c) => KO[c] || c).join('') };
}

function prompt(ymd, day, animals) {
  const lines = animals.map((a) => `- ${a}띠(${BRANCH[a]}): ${ttiYears(a, ymd).map((y) => String(y).slice(2)).join(', ')}년생`).join('\n');
  const shape = `{${animals.map((a) => `"${a}":{"summary":"...","lucky":{"색":"...","숫자":"...","방향":"..."},"ages":{"${String(ttiYears(a, ymd)[0]).slice(2)}":"...", ...}}`).join(',')}}`;
  return `[보는 날] ${ymd} · 그날의 일진 ${day.ganzhi}(${day.ko})

[쓸 띠와 출생 연도]
${lines}

띠마다 아래를 써 주세요.
- summary: 그날 이 띠의 하루를 한 문장으로 (35자 안팎, ~하루예요 꼴)
- lucky: 색(${COLORS} 중 하나), 숫자(1~99 하나), 방향(${DIRS} 중 하나)
- ages: 위에 적은 출생 연도마다 한 문장(30~45자), 나이대에 맞는 일·관계·생활 이야기로 서로 다르게. 키는 두 자리 연도.

이 모양의 JSON 하나만 쓰세요: ${shape}`;
}

async function generate(client, ymd, day) {
  const groups = [TTI_ANIMALS.slice(0, 4), TTI_ANIMALS.slice(4, 8), TTI_ANIMALS.slice(8)];
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIME_LIMIT_MS);
  try {
    const parts = await Promise.all(
      groups.map(async (animals) => {
        const msg = await client.beta.messages.create(
          {
            model: MODEL,
            max_tokens: 4000,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: { effort: 'low' },
            system: SYSTEM,
            messages: [{ role: 'user', content: prompt(ymd, day, animals) }],
          },
          { signal: abort.signal }
        );
        const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
        const obj = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
        return animals.map((a) => [a, clean(obj[a], a, ymd)]);
      })
    );
    return Object.fromEntries(parts.flat());
  } finally {
    clearTimeout(timer);
  }
}

// AI 가 준 값 다듬기 (빠진 칸은 비워 둠)
function clean(v, animal, ymd) {
  const str = (x, n) => (typeof x === 'string' ? x.trim().slice(0, n) : '');
  const ages = {};
  for (const y of ttiYears(animal, ymd)) {
    const k = String(y).slice(2);
    if (v?.ages?.[k]) ages[k] = str(v.ages[k], 120);
  }
  return {
    summary: str(v?.summary, 80),
    lucky: { 색: str(v?.lucky?.['색'], 10), 숫자: str(String(v?.lucky?.['숫자'] ?? ''), 4), 방향: str(v?.lucky?.['방향'], 4) },
    ages,
  };
}

const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default async (req, context) => {
  const url = new URL(req.url);
  const date = kstToday();
  const day = dayInfo(date);
  const saved = await store().get(`tti/${date}`, { type: 'json' }).catch(() => null);

  // 검색 로봇·첫 화면용: 미리 만든 틀에 오늘 글을 넣어서
  if (url.pathname === '/tti' || url.pathname === '/tti/') {
    const shell = await fetch(`${url.origin}/tti.html`).then((r) => (r.ok ? r.text() : null)).catch(() => null);
    if (!shell) return new Response(null, { status: 302, headers: { location: '/' } });
    let html = shell;
    if (saved?.status === 'ready') {
      const [, m, d] = date.split('-').map(Number);
      const body = `<h1>${m}월 ${d}일 오늘의 띠별 운세</h1><p>오늘의 일진은 ${day.ko}(${day.ganzhi})일이에요. 12띠의 오늘 운세와 나이별 운세를 천둥도사가 풀어 드려요.</p>${TTI_ANIMALS.map((a) => {
        const v = saved.data[a] || {};
        return `<section><h2>${a}띠 (${BRANCH[a]}) 오늘의 운세</h2><p>${escHtml(v.summary || '')}</p><ul>${Object.entries(v.ages || {}).map(([k, t]) => `<li>${k}년생: ${escHtml(t)}</li>`).join('')}</ul><p>행운의 색 ${escHtml(v.lucky?.['색'] || '')} · 숫자 ${escHtml(v.lucky?.['숫자'] || '')} · 방향 ${escHtml(v.lucky?.['방향'] || '')}</p></section>`;
      }).join('')}`;
      html = html.replace(/<main class="prerender">[\s\S]*?<nav/, `<main class="prerender">${body}<nav`);
    }
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  }

  if (req.method !== 'GET') return json({ error: '잘못된 요청이에요.' }, 405);
  if (saved?.status === 'ready') return json({ date, day, status: 'ready', data: saved.data });
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (limited(ip)) return json({ error: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.' }, 429);
  if (saved?.status === 'pending' && Date.now() - saved.at < PENDING_STALE_MS) return json({ date, day, status: 'pending' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: '오늘의 띠별 운세가 아직 준비되지 않았어요.', reason: 'disabled' }, 503);
  await store().setJSON(`tti/${date}`, { status: 'pending', at: Date.now() });
  try {
    const client = new Anthropic({ apiKey, timeout: TIME_LIMIT_MS, maxRetries: 0 });
    const data = await generate(client, date, day);
    if (TTI_ANIMALS.some((a) => !data[a]?.summary)) throw new Error('incomplete');
    await store().setJSON(`tti/${date}`, { status: 'ready', at: Date.now(), data });
    return json({ date, day, status: 'ready', data });
  } catch (e) {
    console.error('tti-daily failed:', e?.name || 'error');
    await store().delete(`tti/${date}`).catch(() => {});
    return json({ error: '오늘의 띠별 운세를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.' }, 502);
  }
};

export const config = { path: ['/api/tti-daily', '/tti'] };
