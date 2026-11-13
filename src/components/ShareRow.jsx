// 공유 버튼 줄: 노란 카카오톡(누구나, 2026-11-14) · 링크 복사. 오늘의 운세 · 사주 결과 하단에서 함께 씀
// kakao: sendKakao 에 넘길 카드 내용, path: 링크 복사·카드가 여는 사이트 안 경로
import { useOutletContext } from 'react-router-dom';
import { copyText, displayLink, sendKakao } from '../lib/share.js';
import { trackEvent } from '../lib/analytics.js';

export function ShareButtons({ kakao, path = '/', loggedIn, onNeedLogin, onNotice, event = 'share', label }) {
  const shareKakao = async () => {
    // 2026-11-14: 카카오톡 공유는 비회원도 (퍼지는 통로라 막지 않음). loggedIn·onNeedLogin 은 예전 호출과 맞추려고 남겨 둠
    try {
      await sendKakao({ ...kakao, path });
      trackEvent(event, { method: 'kakao' });
    } catch (e) {
      onNotice?.(e?.message === 'no key' ? '카카오톡 공유는 준비중이에요.' : '카카오톡 공유를 열지 못했어요. 잠시 뒤 다시 시도해 주세요.', e?.message === 'no key' ? undefined : 'negative');
    }
  };
  const copyLink = async () => {
    const ok = await copyText(displayLink(path));
    onNotice?.(ok ? '링크를 복사했어요.' : '복사하지 못했어요. 주소창의 링크를 직접 복사해 주세요.', ok ? 'positive' : 'negative');
    if (ok) trackEvent(event, { method: 'link' });
  };
  return (
    <div className="share-row" role="group" aria-label={label || '공유하기'}>
      <button type="button" className="share-btn is-kakao" onClick={shareKakao} aria-label="카카오톡으로 공유하기">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#000" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.66 6.77l-.95 3.48c-.08.3.26.54.52.37l4.13-2.74c.54.08 1.08.12 1.64.12 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
        </svg>
      </button>
      <button type="button" className="share-btn is-link" onClick={copyLink} aria-label="링크 복사하기">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
          <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
        </svg>
      </button>
    </div>
  );
}

// 결과 화면 맨 아래 공유 카드 (Outlet 안에서 씀 → 로그인 상태·토스트는 Layout 에서)
export default function ResultShare({ kakao, path = '/', title = '천둥도사의 풀이를 나눠 보세요' }) {
  const { auth, openLogin, notify } = useOutletContext();
  return (
    <section className="result-share">
      <p className="result-share-title">{title}</p>
      <ShareButtons kakao={kakao} path={path} loggedIn={!!auth.user} onNeedLogin={openLogin} onNotice={notify} event="result_share" />
    </section>
  );
}
