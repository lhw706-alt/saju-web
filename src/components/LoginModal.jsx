// 로그인 창: 카카오 로그인 (서버: netlify/functions/auth.mjs)
// 카카오 로그인 버튼은 카카오 디자인 가이드(노란 #FEE500 바탕, 검은 말풍선 심볼, 85% 검정 글자)를 따름
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';

export default function LoginModal({ open, enabled, onClose }) {
  const { pathname, search } = useLocation();
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => panel.current?.focus(), 0);
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  // 로그인 뒤 지금 보던 화면으로 돌아오기 (로그인 실패 표시는 빼고)
  const next = `${pathname}${search.replace(/[?&]login=\w+/, '')}`;

  return createPortal(
    <div className="contact-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="login" role="dialog" aria-modal="true" aria-labelledby="login-title" tabIndex={-1} ref={panel}>
        <div className="contact-head">
          <h2 id="login-title" className="contact-title">
            로그인
          </h2>
          <button type="button" className="fortune__close" aria-label="로그인 창 닫기" onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="login-lead">카카오 계정으로 간편하게 로그인해요.</p>
        {enabled ? (
          <a className="kakao-btn" href={`/api/auth/kakao/login?next=${encodeURIComponent(next)}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#000" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.66 6.77l-.95 3.48c-.08.3.26.54.52.37l4.13-2.74c.54.08 1.08.12 1.64.12 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
            </svg>
            카카오 로그인
          </a>
        ) : (
          <p className="login-off">로그인은 준비중이에요. 곧 열려요!</p>
        )}
        <p className="login-note">
          카카오 회원번호와 닉네임만 확인하고, 생년월일시나 연락처는 받지 않아요.{' '}
          <Link to="/privacy" onClick={onClose}>
            개인정보 처리방침
          </Link>
        </p>
      </div>
    </div>,
    document.body
  );
}
