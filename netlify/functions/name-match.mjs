// 이름 궁합 풀이 (/api/name-match, 2026-11-14) — 두 사람의 이름(한글)과 관계로 '이름 소리 오행' 궁합을 스트리밍.
// - 이름은 풀이를 만드는 데만 쓰고 서버에 저장하지 않으며 로그에도 남기지 않는다.
// - 근거는 서버가 다시 계산한 소리 오행(src/lib/nameSound.js)뿐. 한자·사주는 보지 않음.
// - 스트리밍·시간 제한·끝 표시([[END:…]])는 saju-reading.mjs 와 같은 방식.
import Anthropic from '@anthropic-ai/sdk';
import { nameOk, cleanName, nameSummary, relationById } from '../../src/lib/nameSound.js';
import { namePartById } from '../../src/lib/nameTopics.js';
import { json, allowedOrigin, createRateLimiter } from '../lib/guard.mjs';

const MODEL = process.env.SAJU_MODEL || 'claude-opus-5-5';
const TIME_LIMIT_MS = 55_000;
const rateLimited = createRateLimiter(10); // 한 번에 2건씩 → 1분 5번

const SYSTEM = `당신은 한국어로 '이름 궁합'을 재미있게 풀어 주는 해설가입니다. 서버가 두 이름의 글자마다 첫소리로 소리 오행(목·화·토·금·수)을 계산해 두었고, 당신은 그 결과만 보고 두 사람의 케미를 풀어 줍니다.
글쓰기
- 따뜻하고 산뜻한 해요체. 오행 용어는 쉽게 풀어 씁니다.
- 근거를 함께 적으세요: "하늘 님 이름에 흙(土) 소리가 많아서 …"처럼.
- 형식은 사용자 메시지의 지시를 따르세요. 표·이모지·인사말·면책 문구는 쓰지 마세요(화면에 따로 있습니다).
하지 말 것
- 이별·죽음·사고·질병 같은 겁주는 예언, 한쪽을 깎아내리는 말.
- 한자 뜻·획수·사주를 본 것처럼 쓰는 것. 주어지지 않은 정보 지어내기.
- 부적·굿·개명·유료 상담 권유.`;

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
  if (!allowedOrigin(req)) return json({ error: '허용되지 않은 출처예요.' }, 403);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: '잘못된 요청이에요.' }, 400);
  }
  const part = namePartById(body?.part);
  const rel = relationById(body?.relation);
  if (!part || !rel) return json({ error: '잘못된 요청이에요.' }, 400);
  if (!nameOk(body?.me) || !nameOk(body?.partner)) return json({ error: '이름은 한글 2~5글자로 적어 주세요.' }, 400);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: '풀이가 아직 준비되지 않았어요.', reason: 'disabled' }, 503);
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (rateLimited(ip)) return json({ error: '요청이 많아요. 1분 뒤에 다시 시도해 주세요.', reason: 'rate_limited' }, 429);

  const me = cleanName(body.me);
  const partner = cleanName(body.partner);
  const userText = `[두 사람] 나: ${me} · 상대: ${partner} · 관계: ${rel.label}

[이름 소리 오행 — 서버 계산 결과]
${nameSummary(me, partner)}

${part.format(rel.label, !!rel.romantic)}`;

  const client = new Anthropic({ apiKey, timeout: TIME_LIMIT_MS, maxRetries: 0 });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (t) => {
        try {
          controller.enqueue(encoder.encode(t));
        } catch {
          /* 방문자가 연결을 끊음 */
        }
      };
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), TIME_LIMIT_MS);
      req.signal?.addEventListener('abort', () => abort.abort());
      try {
        const ms = client.beta.messages.stream(
          {
            model: MODEL,
            max_tokens: 3000,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: { effort: 'low' },
            system: SYSTEM,
            messages: [{ role: 'user', content: userText }],
          },
          { signal: abort.signal }
        );
        for await (const event of ms) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') send(event.delta.text);
        }
        const final = await ms.finalMessage();
        if (final.stop_reason === 'refusal') send('\n\n[[END:refusal]]');
        else if (final.stop_reason === 'max_tokens') send('\n\n[[END:truncated]]');
      } catch (error) {
        const timeout = abort.signal.aborted || error instanceof Anthropic.APIUserAbortError || error instanceof Anthropic.APIConnectionTimeoutError;
        console.error('name-match failed:', timeout ? 'timeout' : error?.status || 'unknown');
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

export const config = { path: '/api/name-match' };
