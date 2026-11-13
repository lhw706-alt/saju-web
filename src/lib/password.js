// 비밀번호 규칙 — 화면(회원가입·비밀번호 재설정)과 서버(netlify/functions/auth.mjs)가 같이 씀 (2026-11-13)
export function passwordChecks(pw) {
  const p = String(pw || '');
  const kinds = [/[A-Za-z]/, /[0-9]/, /[^A-Za-z0-9\s]/].filter((r) => r.test(p)).length;
  return [
    { id: 'mix', label: '영문/숫자/특수문자 중 2가지 이상 포함', ok: kinds >= 2 },
    { id: 'len', label: '8자 이상 32자 이하 입력 (공백 제외)', ok: p.length >= 8 && p.length <= 32 && !/\s/.test(p) },
    { id: 'rep', label: '연속 3자 이상 동일한 문자/숫자 제외', ok: p.length > 0 && !/(.)\1\1/.test(p) },
  ];
}
export const passwordOk = (pw) => passwordChecks(pw).every((c) => c.ok);
