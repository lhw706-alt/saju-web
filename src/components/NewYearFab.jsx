// 메인 화면 왼쪽 아래 '신년운세 인기' 떠 있는 버튼 (2026-11-15 사용자 지시). 오른쪽 아래 오늘의 운세 부적(FortuneFab)과 겹치지 않게 왼쪽.
// 붉은 낙관 新 + 'HOT' 대신 '인기' 작은 표 + 문구. 누르면 신년운세 소개(/newyear). 닫으면 이 탭에서는 다시 안 뜸.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NEXT_YEAR } from '../lib/topics.js';
import { trackEvent } from '../lib/analytics.js';

const KEY = 'saju:ny-fab-closed';

export default function NewYearFab() {
  const navigate = useNavigate();
  const [closed, setClosed] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  if (closed) return null;
  const close = (e) => {
    e.stopPropagation();
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* 무시 */
    }
    setClosed(true);
  };
  return (
    <div className="ny-fab">
      <button
        type="button"
        className="ny-fab-main"
        onClick={() => {
          trackEvent('content_click', { content: 'newyear', from: 'fab' });
          navigate('/newyear');
        }}
      >
        <span className="ny-fab-seal" aria-hidden="true">
          新
        </span>
        <span className="ny-fab-text">
          <em>지금 인기</em>
          <b>{NEXT_YEAR} 신년운세 보기</b>
        </span>
        <svg className="ny-fab-arrow" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button type="button" className="ny-fab-close" aria-label="신년운세 안내 닫기" onClick={close}>
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
