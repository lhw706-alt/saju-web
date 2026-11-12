// 입력값(과 평생 사주 풀이)은 이 브라우저 탭(sessionStorage)에만 잠시 둔다. 사주 화면(/start·/result)을 벗어나면 지우고(Layout), 탭을 닫아도 사라진다. 서버에는 저장하지 않는다.
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
    sessionStorage.removeItem(REPORT_KEY);
    sessionStorage.removeItem(FRESH_KEY);
  } catch {
    /* 무시 */
  }
}

// 방금 입력을 마쳤는지 (천둥도사 로딩은 이때만. 새로고침이면 안 나옴)
const FRESH_KEY = 'saju:fresh';
export function markFresh() {
  try { sessionStorage.setItem(FRESH_KEY, '1'); } catch { /* 무시 */ }
}
export function peekFresh() {
  try { return sessionStorage.getItem(FRESH_KEY) === '1'; } catch { return false; }
}
export function clearFresh() {
  try { sessionStorage.removeItem(FRESH_KEY); } catch { /* 무시 */ }
}

// 평생 사주 리포트 풀이를 이 탭에 보관 → 새로고침해도 AI 를 다시 부르지 않음 (입력이 바뀌면 버림)
const REPORT_KEY = 'saju:report';
export function loadReport(input) {
  try {
    const v = JSON.parse(sessionStorage.getItem(REPORT_KEY) || 'null');
    return v && v.key === JSON.stringify(input) ? v.parts : {};
  } catch {
    return {};
  }
}
export function saveReportPart(input, id, text) {
  try {
    const key = JSON.stringify(input);
    const v = JSON.parse(sessionStorage.getItem(REPORT_KEY) || 'null');
    const parts = v && v.key === key ? v.parts : {};
    parts[id] = text;
    sessionStorage.setItem(REPORT_KEY, JSON.stringify({ key, parts }));
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
