// Google Analytics 4 연동 (다모아픽과 같은 방식).
// GA4 측정 ID(G-로 시작)를 넣으면 활성화된다. 비어 있으면 아무것도 전송하지 않는다.
// 주의: 생년월일·시각·성별·출생지 등 입력값은 이벤트에 절대 넣지 않는다 (주소에도 없음 — sessionStorage 에만 있음).
export const GA_MEASUREMENT_ID = '';

let initialized = false;

export function initAnalytics() {
  if (initialized || !GA_MEASUREMENT_ID || typeof window === 'undefined') return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  // 첫 페이지 조회는 config 가 보내고, 페이지 이동(SPA)은 GA4 향상된 측정의
  // '브라우저 기록 이벤트 기반 페이지 변경'이 자동 집계한다 (직접 page_view 를 보내면 중복).
  window.gtag('config', GA_MEASUREMENT_ID);
}

export function trackEvent(name, params = {}) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}
