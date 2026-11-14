// 풀이 스트리밍 호출 (/api/reading: 주제 풀이·평생 사주 리포트 등, /api/name-match: 이름 궁합)
// onText(지금까지 받은 글) 를 계속 부르고, 끝나면 { text, end, error } 를 돌려준다.
export const END_MESSAGES = {
  refusal: '이 부분은 풀이를 만들지 못했어요.',
  truncated: '풀이가 길어져 여기서 끝났어요.',
  timeout: '풀이가 오래 걸려 여기서 멈췄어요. 다시 시도해 주세요.',
  error: '풀이 중에 문제가 생겼어요. 다시 시도해 주세요.',
};
const END_RE = /\n*\[\[END:(\w+)\]\]\s*$/;

// partner: 궁합일 때 상대 생년월일시
// date: 하루 운세의 보는 날 (YYYY-MM-DD)
export function streamReading({ input, topic, signal, onText, partner = null, date = null }) {
  return streamPost('/api/reading', { input, topic, ...(partner ? { partner } : {}), ...(date ? { date } : {}) }, signal, onText);
}

// 이름 궁합 (/api/name-match): 두 이름·관계·부분(name1|name2)
export function streamNameMatch({ me, partner, relation, part, signal, onText }) {
  return streamPost('/api/name-match', { me, partner, relation, part }, signal, onText);
}

// 타로 (/api/tarot): 뽑은 카드·장수·분야·질문
export function streamTarot({ cards, spread, topic, question, pay = false, signal, onText }) {
  return streamPost('/api/tarot', { cards, spread, topic, question, pay }, signal, onText);
}

async function streamPost(url, body, signal, onText) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    return { text: '', end: null, error: data.error || '풀이를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.' };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText?.(text.replace(END_RE, ''));
  }
  const m = text.match(END_RE);
  const clean = text.replace(END_RE, '');
  if (m && !clean.trim()) return { text: '', end: m[1], error: END_MESSAGES[m[1]] || END_MESSAGES.error };
  return { text: clean, end: m ? m[1] : null, error: null };
}
