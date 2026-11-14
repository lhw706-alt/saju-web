// 타로 풀이 (/api/tarot, 2026-11-14) — 뽑은 카드(1장 또는 3장, 정/역방향)·궁금한 분야·질문(선택)으로 천둥도사가 풀이를 스트리밍.
// 질문은 풀이에만 쓰고 저장·로그하지 않음. 카드는 화면에서 고르지만 서버가 번호·중복·장수를 다시 확인.
import Anthropic from '@anthropic-ai/sdk';
import { tarotById, TAROT_TOPICS, TAROT_SPREADS, TAROT_Q_MAX } from '../../src/lib/tarot.js';
import { wishProblem } from '../../src/lib/wish.js';
import { json, allowedOrigin, createRateLimiter } from '../lib/guard.mjs';
import { sessionOf } from '../lib/session.mjs';
import { getStore } from '@netlify/blobs';
import { spend, refundSpend } from '../lib/wallet.mjs';
import { PRICES } from '../../src/lib/wallet.js';

// 하루 2번 (2026-11-14 사용자 지시 — 풀이 비용). 회원은 회원번호, 비회원은 접속 IP 로 셈. KST 자정에 다시 2번.
export const TAROT_DAILY = 2;
const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const whoKey = (req, context) => {
  const s = sessionOf(req);
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  return s ? `u/${s.sub}` : `ip/${ip}`;
};

const MODEL = process.env.SAJU_MODEL || 'claude-opus-5-5';
const TIME_LIMIT_MS = 55_000;
const rateLimited = createRateLimiter(6);

const SYSTEM = `당신은 한국어로 타로 카드를 읽어 주는 '천둥도사'입니다. 서버가 알려 준 카드·방향·자리만 보고 풀이합니다.
글쓰기
- 따뜻하고 차분한 해요체. 카드 이름을 들며 "현재 자리에 '별'이 정방향으로 나와서 …"처럼 근거를 밝힙니다.
- 단정 대신 가능성과 조언으로. 좋은 점과 조심할 점을 함께 씁니다.
- 형식은 사용자 메시지를 따르고, 표·이모지·인사말·면책 문구는 쓰지 않습니다.
하지 말 것
- 죽음·사고·질병·이별 같은 겁주는 예언. '죽음'·'탑' 카드는 변화와 새 출발로 풉니다.
- 의료·투자 종목·법률 판단, 부적·굿·유료 상담 권유.
- 주어지지 않은 카드나 정보 지어내기.`;

export default async (req, context) => {
  const store = getStore({ name: 'tarot-count', consistency: 'strong' });
  const countKey = `${whoKey(req, context)}/${kstDay()}`;
  // 오늘 남은 횟수 (화면이 카드를 섞기 전에 물어봄)
  if (req.method === 'GET') {
    const used = Number(await store.get(countKey).catch(() => 0)) || 0;
    return json({ left: Math.max(0, TAROT_DAILY - used), daily: TAROT_DAILY, prices: { three: PRICES.tarot3.credits, extra: PRICES.tarotExtra.credits } });
  }
  if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
  if (!allowedOrigin(req)) return json({ error: '허용되지 않은 출처예요.' }, 403);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: '잘못된 요청이에요.' }, 400);
  }
  const spread = TAROT_SPREADS[body?.spread];
  const topic = TAROT_TOPICS.find((t) => t.id === body?.topic);
  const cards = Array.isArray(body?.cards) ? body.cards : [];
  if (!spread || !topic || cards.length !== spread.pos.length) return json({ error: '카드를 다시 골라 주세요.' }, 400);
  const picked = cards.map((c) => ({ card: tarotById(c?.id), rev: !!c?.rev }));
  if (picked.some((p) => !p.card) || new Set(picked.map((p) => p.card.id)).size !== picked.length) return json({ error: '카드를 다시 골라 주세요.' }, 400);
  const q = String(body?.question || '').trim().replace(/\s+/g, ' ');
  if (q.length > TAROT_Q_MAX) return json({ error: `질문은 ${TAROT_Q_MAX}자까지 적을 수 있어요.` }, 400);
  if (q && q.length >= 2 && wishProblem(q)) return json({ error: wishProblem(q) }, 400);

  // 복채 (2026-11-14): 세 장 = 15천(무료 횟수와 별개), 한 장은 하루 무료 2번 · 그 뒤로는 한 번에 10천. 복채는 회원만.
  const used = Number(await store.get(countKey).catch(() => 0)) || 0;
  const three = spread.pos.length === 3;
  const price = three ? PRICES.tarot3 : used >= TAROT_DAILY ? PRICES.tarotExtra : null;
  const member = sessionOf(req);
  if (price && !member) return json({ error: three ? '세 장 펼침은 복채로 볼 수 있어요. 로그인해 주세요.' : `타로는 하루에 ${TAROT_DAILY}번까지 무료예요. 로그인하면 복채로 더 볼 수 있어요.`, reason: 'login', login: true, need: price.credits }, 401);
  if (price && body?.pay !== true) return json({ error: `${price.label}에 복채 ${price.credits}천이 들어요.`, reason: 'pay_required', need: price.credits }, 402);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: '풀이가 아직 준비되지 않았어요.', reason: 'disabled' }, 503);
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (rateLimited(ip)) return json({ error: '요청이 많아요. 1분 뒤에 다시 시도해 주세요.', reason: 'rate_limited' }, 429);

  let paidRef = null;
  if (price) {
    paidRef = `tarot-${Date.now().toString(36)}`;
    const sp = await spend(member.sub, price.credits, price.label, paidRef);
    if (!sp.ok) return json({ error: '복채가 모자라요. 충전한 뒤 다시 시도해 주세요.', reason: 'no_credit', need: price.credits, balance: sp.balance }, 402);
  }
  if (!three || !price) await store.set(countKey, String(used + 1)); // 무료 한 장·추가 한 장은 하루 횟수로 셈 (세 장은 따로)

  const lines = picked.map((p, i) => `- ${spread.pos[i]}: ${p.card.ko}(${p.card.en}) ${p.rev ? '역방향' : '정방향'} — 핵심어: ${p.rev ? p.card.rev : p.card.up}`).join('\n');
  const one = spread.pos.length === 1;
  const userText = `[궁금한 분야] ${topic.label}
[질문] ${q || '(따로 적지 않음 — 분야에 맞춰 풀어 주세요)'}
[뽑은 카드]
${lines}

아래 제목을 그대로, 이 순서대로 쓰세요.
${one ? `## ${picked[0].card.ko}
(4~6문장. 카드의 상징과 방향을 근거로 지금 상황과 메시지를 풉니다)` : picked.map((p, i) => `## ${spread.pos[i]} · ${p.card.ko}\n(2~3문장)`).join('\n')}
${one ? '' : '## 세 장을 이어 보면\n(3~4문장. 흐름이 어떻게 이어지는지)\n'}## 천둥도사의 한마디
(한두 문장의 조언)
전체 ${one ? '350~500' : '550~800'}자.`;

  const client = new Anthropic({ apiKey, timeout: TIME_LIMIT_MS, maxRetries: 0 });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (t) => {
        try {
          controller.enqueue(encoder.encode(t));
        } catch {
          /* 연결 끊김 */
        }
      };
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), TIME_LIMIT_MS);
      req.signal?.addEventListener('abort', () => abort.abort());
      try {
        const ms = client.beta.messages.stream(
          { model: MODEL, max_tokens: 3000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default', output_config: { effort: 'low' }, system: SYSTEM, messages: [{ role: 'user', content: userText }] },
          { signal: abort.signal }
        );
        for await (const event of ms) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') send(event.delta.text);
        }
        const final = await ms.finalMessage();
        if (final.stop_reason === 'refusal') {
          if (paidRef) await refundSpend(member.sub, price.credits, `${price.label} 돌려받음`, paidRef).catch(() => {});
          send('\n\n[[END:refusal]]');
        }
        else if (final.stop_reason === 'max_tokens') send('\n\n[[END:truncated]]');
      } catch (error) {
        const timeout = abort.signal.aborted || error instanceof Anthropic.APIUserAbortError || error instanceof Anthropic.APIConnectionTimeoutError;
        console.error('tarot failed:', timeout ? 'timeout' : error?.status || 'unknown');
        if (paidRef) await refundSpend(member.sub, price.credits, `${price.label} 돌려받음`, paidRef).catch(() => {}); // 풀이를 못 만들면 복채 돌려줌
        send(`\n\n[[END:${timeout ? 'timeout' : 'error'}]]`);
      } finally {
        clearTimeout(timer);
        try {
          controller.close();
        } catch {
          /* 이미 닫힘 */
        }
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
};

export const config = { path: '/api/tarot' };
