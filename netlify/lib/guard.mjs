// Netlify Function 공통 보호 장치. functions 폴더 밖에 두어 그 자체로 함수가 되지 않게 함.

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

// 허용 도메인: Netlify 환경 변수 ALLOWED_HOSTS (쉼표로 구분, 예: "example.com,www.example.com,saju.netlify.app")
// 미리보기 주소(<id>--<site>.netlify.app)는 등록한 *.netlify.app 주소의 하위로 허용.
export function allowedOrigin(req) {
  const origin = req.headers.get('origin') || '';
  if (!origin) return true; // 같은 출처 요청은 Origin 이 없을 수 있음
  let host;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (host === 'localhost' || host === '127.0.0.1') return true;
  const list = (process.env.ALLOWED_HOSTS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return true; // 도메인 연결 전에는 막지 않음
  return list.some((h) => host === h || (h.endsWith('.netlify.app') && host.endsWith(`--${h}`)));
}

// 인스턴스 단위의 간단한 호출 제한 (서버가 여러 대면 대략적인 값). 비용 폭주 방지용.
export function createRateLimiter(perWindow = 5, windowMs = 60_000) {
  const hits = new Map();
  return (ip) => {
    const now = Date.now();
    const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    list.push(now);
    hits.set(ip, list);
    if (hits.size > 5000) hits.clear();
    return list.length > perWindow;
  };
}
