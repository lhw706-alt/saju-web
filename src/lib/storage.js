// 입력값은 이 브라우저 탭(sessionStorage)에만 잠시 둔다. 탭을 닫으면 사라지고 서버에는 저장하지 않는다.
const KEY = 'saju:input';

export function saveInput(input) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(input));
  } catch {
    /* 저장 불가(사생활 보호 모드 등) — 무시 */
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
