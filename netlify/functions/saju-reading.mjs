// 사주 풀이 — 화면 이름 '천둥도사' (Netlify Function, 서버에서만 실행)
// - 브라우저가 보낸 생년월일시로 서버가 만세력을 다시 계산하고(src/lib/saju.js), 계산 결과만 AI 에 넘긴다.
//   이름·연락처는 받지 않는다. 입력과 풀이는 저장하지 않고 로그에도 남기지 않는다.
// - 풀이 글은 글자 단위로 스트리밍한다 (Netlify 동기 함수 실행 한도 60초 → 55초에서 끊고 안내 문구 추가).
// - API 키는 Netlify 환경 변수 ANTHROPIC_API_KEY 에만 둔다 (VITE_ 접두사 금지 → 브라우저 번들에 안 들어감).

import Anthropic from '@anthropic-ai/sdk';
import { computeSaju, chartSummary, dayLuck, dayLuckSummary, SajuInputError, normalizeInput } from '../../src/lib/saju.js';
import { getStore } from '@netlify/blobs';
import { topicById, TOPIC_FORMAT, ttiYears } from '../../src/lib/topics.js';
import { json, allowedOrigin, createRateLimiter } from '../lib/guard.mjs';
import { sessionOf } from '../lib/session.mjs';
import { owned, getRecord, putRecord, itemKey, itemRecordId } from '../lib/wallet.mjs';
import { PAID_ITEMS } from '../../src/lib/wallet.js';

const MODEL = process.env.SAJU_MODEL || 'claude-opus-5-5';
const TIME_LIMIT_MS = 55_000;

const SYSTEM = `당신은 한국어로 사주명리를 풀어 주는 해설가입니다. 사용자의 사주 원국은 서버가 만세력으로 이미 계산해 두었고, 당신은 그 계산 결과만 보고 해석합니다. 간지를 다시 계산하거나 바꾸지 마세요.

글쓰기
- 따뜻하고 차분한 해요체. 명리 용어(일간, 십성, 대운 등)는 처음 나올 때 괄호로 짧게 풀어 주세요.
- 근거를 함께 적으세요: "월지에 편관이 있어서 …"처럼 원국의 어느 글자에서 그렇게 읽었는지 밝힙니다.
- 단정 대신 경향으로 말하세요 ("~한 편이에요", "~하기 쉬워요"). 좋은 점과 조심할 점을 균형 있게 씁니다.
- 형식은 사용자 메시지의 지시를 따르세요. 표·이모지·인사말·면책 문구는 쓰지 마세요(화면에 따로 있습니다).

하지 말 것
- 죽음·수명·큰 사고·이혼·불임 같은 불안을 주는 예언, '살(煞)'로 겁주는 표현.
- 질병 진단이나 치료 조언, 투자 종목·매매 시점, 법률 판단. 건강은 '생활 습관에서 신경 쓸 부분' 정도로만.
- 부적·굿·개명·유료 상담 권유, 특정 종교 권유.
- 원국에 없는 글자나 계산 결과를 지어내는 것. 태어난 시각을 모르면 시주 없이 해석하고, 그 때문에 덜 정확할 수 있는 부분을 한 번만 짧게 언급합니다.`;

// 평생 사주 리포트는 한 번에 4개를 동시에 요청하므로 넉넉하게 (1분 12회)
const rateLimited = createRateLimiter(12);

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
  if (!allowedOrigin(req)) return json({ error: '허용되지 않은 출처예요.' }, 403);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: '잘못된 요청이에요.' }, 400);
  }
  const topic = topicById(body?.topic);
  if (!topic) return json({ error: '풀이 주제를 골라 주세요.' }, 400);

  let chart;
  try {
    chart = computeSaju(body?.input);
  } catch (e) {
    if (e instanceof SajuInputError) return json({ error: e.message }, 400);
    console.error('saju-reading: compute failed');
    return json({ error: '사주를 계산하지 못했어요.' }, 400);
  }

  // 궁합: 상대 원국도 서버에서 다시 계산
  let partner = null;
  if (topic.pair) {
    try {
      partner = computeSaju(body?.partner);
    } catch (e) {
      if (e instanceof SajuInputError) return json({ error: `상대 정보: ${e.message}` }, 400);
      return json({ error: '상대의 사주를 계산하지 못했어요.' }, 400);
    }
  }

  // 하루 운세: 보는 날(YYYY-MM-DD)을 확인하고 그날의 일진 계산 — 어제~1년 뒤까지만
  let day = null;
  if (topic.day) {
    const ymd = String(body?.date || '');
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    const t = m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
    const kstToday = Date.parse(new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10));
    if (!m || Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== ymd || t < kstToday - 2 * 86400e3 || t > kstToday + 366 * 86400e3) {
      return json({ error: '운세를 볼 날짜를 다시 골라 주세요. 오늘부터 1년 안의 날만 볼 수 있어요.' }, 400);
    }
    day = dayLuck(chart, ymd);
  }

  // 유료 주제(신년운세 한 해 흐름·월별 상세, 평생 사주 — 2026-11-15 처음부터 유료): 이 회원이 이 사람(·이 해) 상품을 샀는지 확인
  let paidRec = null;
  if (topic.paid) {
    const s = sessionOf(req);
    if (!s) return json({ error: '이 풀이는 복채로 볼 수 있어요. 로그인해 주세요.', login: true }, 401);
    const pkey = itemKey(s.sub, topic.paid, body?.input);
    if (!(await owned(pkey))) return json({ error: '먼저 복채로 열어 주세요.', reason: 'not_owned' }, 402);
    // 풀이 기록에서 사람별로 거를 수 있게 (2026-11-15 사용자 지시) — 생년월일 대신 '나' 또는 '1990년생 · 여성'만
    const n = normalizeInput(body?.input);
    const same = (a, b) => ['calendar', 'year', 'month', 'day', 'gender', 'city'].every((k) => String(a?.[k]) === String(b?.[k])) && Boolean(a?.leap) === Boolean(b?.leap) && (a?.timeKnown ? `${a.hour}:${a.minute}` : '-') === (b?.timeKnown ? `${b.hour}:${b.minute}` : '-');
    const myBirth = (await getStore({ name: 'users', consistency: 'strong' }).get(s.sub, { type: 'json' }).catch(() => null))?.birth;
    let me = false;
    try {
      me = Boolean(myBirth) && same(normalizeInput(myBirth), n);
    } catch {
      me = false;
    }
    const who = me ? '나' : `${n.year}년생 · ${n.gender === 'female' ? '여성' : '남성'}`;
    paidRec = { uid: s.sub, id: itemRecordId(topic.paid, pkey), kind: PAID_ITEMS[topic.paid].kind, who };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: '풀이가 아직 준비되지 않았어요.', reason: 'disabled' }, 503);

  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (rateLimited(ip)) return json({ error: '요청이 많아요. 1분 뒤에 다시 시도해 주세요.', reason: 'rate_limited' }, 429);

  const userText = partner
    ? `[나의 사주 원국 — 서버 계산 결과]
${chartSummary(chart)}

[상대의 사주 원국 — 서버 계산 결과]
${chartSummary(partner)}

[풀이 주제] ${topic.label}
다룰 내용: ${topic.focus}
기준 연도: ${chart.seun.year}년

${topic.format}`
    : `[사주 원국 — 서버 계산 결과]
${chartSummary(chart)}

[풀이 주제] ${topic.label}
다룰 내용: ${topic.focus}
${day ? `[보는 날 — 서버 계산 결과]
${dayLuckSummary(day)}${topic.id === 'tti' ? `\n같은 띠 출생 연도(나이별로 쓸 것, 이 순서대로): ${ttiYears(chart.animal, day.date).map((y) => `${String(y).slice(2)}년생`).join(', ')}` : ''}` :`기준 연도: ${topic.year === 'next' ? chart.nextSeun.year : chart.seun.year}년`}

${topic.format || TOPIC_FORMAT}`;

  const client = new Anthropic({ apiKey, timeout: TIME_LIMIT_MS, maxRetries: 0 });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let full = '';
      const send = (t) => { full += t; try { controller.enqueue(encoder.encode(t)); } catch { /* 방문자가 연결을 끊음 */ } };
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), TIME_LIMIT_MS);
      req.signal?.addEventListener('abort', () => abort.abort()); // 방문자가 창을 닫으면 생성도 멈춤
      try {
        const ms = client.beta.messages.stream({
          model: MODEL,
          max_tokens: topic.maxTokens || 6000, // 무료 사주는 1500 (비용 최소)
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: 'low' },
          system: SYSTEM,
          messages: [{ role: 'user', content: userText }],
        }, { signal: abort.signal });
        for await (const event of ms) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') send(event.delta.text);
        }
        const final = await ms.finalMessage();
        if (paidRec && final.stop_reason === 'end_turn' && full.trim()) {
          // 마이페이지 '풀이 기록': 같은 상품 한 건에 부분(신년운세 newyear·nym1·nym2 / 평생 사주 life1~4)을 모음
          const prev = (await getRecord(paidRec.uid, paidRec.id)) || {};
          await putRecord(paidRec.uid, paidRec.id, {
            kind: paidRec.kind,
            who: paidRec.who,
            ...(paidRec.kind === 'newyear' ? { year: chart.nextSeun.year } : {}),
            at: prev.at || new Date().toISOString(),
            parts: { ...(prev.parts || {}), [topic.id]: full },
          }).catch(() => {});
        }
        if (final.stop_reason === 'refusal') send('\n\n[[END:refusal]]');
        else if (final.stop_reason === 'max_tokens') send('\n\n[[END:truncated]]');
      } catch (error) {
        const kind =
          abort.signal.aborted || error instanceof Anthropic.APIUserAbortError ? 'timeout'
          : error instanceof Anthropic.RateLimitError ? 'busy'
          : error instanceof Anthropic.AuthenticationError ? 'auth'
          : error instanceof Anthropic.APIConnectionTimeoutError ? 'timeout'
          : error instanceof Anthropic.APIError ? `api_${error.status}`
          : 'unknown';
        console.error('saju-reading failed:', kind);
        send(`\n\n[[END:${kind === 'timeout' ? 'timeout' : 'error'}]]`);
      } finally {
        clearTimeout(timer);
        try { controller.close(); } catch { /* 이미 닫힘 */ }
      }
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
};

export const config = { path: '/api/reading' };
