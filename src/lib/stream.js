// /api/reading 스트리밍 호출 (주제 풀이·평생 사주 리포트가 함께 씀)
// onText(지금까지 받은 글) 를 계속 부르고, 끝나면 { text, end, error } 를 돌려준다.
export const END_MESSAGES = {
  refusal: '이 부분은 풀이를 만들지 못했어요.',
  truncated: '풀이가 길어져 여기서 끝났어요.',
  timeout: '풀이가 오래 걸려 여기서 멈췄어요. 다시 시도해 주세요.',
  error: '풀이 중에 문제가 생겼어요. 다시 시도해 주세요.',
};
const END_RE = /\n*\[\[END:(\w+)\]\]\s*$/;

export async function streamReading({ input, topic, signal, onText }) {
  const res = await fetch('/api/reading', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input, topic }),
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
