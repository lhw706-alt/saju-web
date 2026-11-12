// 입력값(과 평생 사주 풀이)은 이 브라우저 탭(sessionStorage)에만 잠시 둔다. 사주 화면(/start·/result)을 벗어나면 지우고(Layout), 탭을 닫아도 사라진다. 서버에는 저장하지 않는다.
// 지난 입력 불러오기는 아래 PRESET (localStorage, 사용자가 켰을 때만). 회원 기능이 생기면 계정에 저장하는 방식으로 옮길 수 있음
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

// 불러오기: 사용자가 "내 정보 기억하기"를 켜면 생년월일시를 이 브라우저(localStorage)에만 저장. 서버로 보내지 않음.
// 한 브라우저에서 여러 명을 볼 수 있어 최근 순 최대 5명까지 (같은 정보는 하나만). 첫 입력 화면에서 불러오기·지우기
const PRESETS_KEY = 'saju:presets';
const OLD_PRESET_KEY = 'saju:preset'; // 예전 한 명 저장 방식 → 목록으로 옮김
const MAX_PRESETS = 5;
const presetId = (p) => [p.calendar, p.leap ? 1 : 0, p.year, p.month, p.day, p.timeKnown ? `${p.hour}:${p.minute || 0}` : '-', p.gender, p.city].join('|');
export function loadPresets() {
  try {
    let list = JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]');
    const old = JSON.parse(localStorage.getItem(OLD_PRESET_KEY) || 'null');
    if (old && old.year && old.gender) {
      list = [old, ...list.filter((x) => presetId(x) !== presetId(old))].slice(0, MAX_PRESETS);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
      localStorage.removeItem(OLD_PRESET_KEY);
    }
    return Array.isArray(list) ? list.filter((x) => x && x.year && x.gender) : [];
  } catch {
    return [];
  }
}
export function savePreset(input) {
  try {
    const list = loadPresets().filter((x) => presetId(x) !== presetId(input));
    localStorage.setItem(PRESETS_KEY, JSON.stringify([input, ...list].slice(0, MAX_PRESETS)));
  } catch {
    /* 무시 */
  }
}
export function removePreset(input) {
  try {
    const list = loadPresets().filter((x) => presetId(x) !== presetId(input));
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}
