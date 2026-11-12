// 입력값은 이 브라우저 탭(sessionStorage)에만 잠시 둔다. 사주 화면(/start·/result)을 벗어나면 지우고(Layout), 탭을 닫아도 사라진다. 서버에는 저장하지 않는다.
// TODO(추후): 회원 기능이 생기면 "내 사주 프리셋"을 저장해 입력 없이 바로 볼 수 있게 (2026-11-13 사용자 계획)
const KEY = 'saju:input';

export function saveInput(input) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(input));
  } catch {
    /* 저장 불가(사생활 보호 모드 등) — 무시 */
  }
}

export function clearInput() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}

export function loadInput() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// 메인 카드에서 고른 풀이 주제 → 결과 화면에서 바로 시작 (결과 화면이 읽은 뒤 지움)
const TOPIC_KEY = 'saju:topic';
export function saveTopic(id) {
  try { sessionStorage.setItem(TOPIC_KEY, id); } catch { /* 무시 */ }
}
export function peekTopic() {
  try { return sessionStorage.getItem(TOPIC_KEY); } catch { return null; }
}
export function clearTopic() {
  try { sessionStorage.removeItem(TOPIC_KEY); } catch { /* 무시 */ }
}
