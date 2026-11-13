// 공유 공용 (오늘의 운세 · 사주 결과 하단): 카카오톡 공유(로그인 회원만) · 링크 복사 — 2026-11-13
// 카카오 JavaScript SDK 는 누를 때만 불러옴. 키 = Netlify 환경 변수 VITE_KAKAO_JS_KEY (JavaScript 키, 공개돼도 되는 키)
// 카카오 개발자 콘솔: 앱 → 제품 링크 관리 → 웹 도메인 에 사이트 주소가 등록돼 있어야 카드의 링크·버튼이 동작
import { SITE } from '../site.js';

const KAKAO_SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';

export function loadKakao() {
  const key = import.meta.env.VITE_KAKAO_JS_KEY;
  if (!key) return Promise.reject(new Error('no key'));
  if (window.Kakao?.isInitialized?.()) return Promise.resolve(window.Kakao);
  return new Promise((resolve, reject) => {
    const done = () => {
      if (!window.Kakao.isInitialized()) window.Kakao.init(key);
      resolve(window.Kakao);
    };
    if (window.Kakao) return done();
    const sc = document.createElement('script');
    sc.src = KAKAO_SDK;
    sc.crossOrigin = 'anonymous';
    sc.onload = done;
    sc.onerror = () => reject(new Error('sdk'));
    document.head.appendChild(sc);
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  }
}

// 카카오 피드 카드 보내기. path: '/fortune' 처럼 사이트 안 경로, image: public 의 파일 이름(800×400)
export async function sendKakao({ title, description, path = '/', button = '사주천문 가기', image = 'share-saju.png' }) {
  const Kakao = await loadKakao();
  const url = `${SITE.url}${path}`;
  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title,
      description,
      imageUrl: `${SITE.url}/${image}`,
      imageWidth: 800,
      imageHeight: 400,
      link: { mobileWebUrl: url, webUrl: url },
    },
    buttons: [{ title: button, link: { mobileWebUrl: url, webUrl: url } }],
  });
}

// 링크 복사용 읽기 쉬운 주소 (사주천문.com/…)
export const displayLink = (path = '/') => `${SITE.displayUrl}${path === '/' ? '' : path}`;
