import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { SITE, PARTNER } from '../site.js';

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app">
      <div className="sky" aria-hidden="true" />
      <header className="header">
        <Link to="/" className="brand" aria-label={`${SITE.name} 처음으로`}>
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
            <path d="M20 5a11 11 0 1 0 6 18A9 9 0 1 1 20 5z" fill="currentColor" />
          </svg>
          <span className="brand-name">{SITE.name}</span>
          <span className="brand-hanja">{SITE.hanja}</span>
        </Link>
        <nav className="nav">
          <Link to="/">사주 보기</Link>
        </nav>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <a className="partner" href={PARTNER.url} target="_blank" rel="noopener">
          <span className="partner-tag">함께 운영하는 서비스</span>
          <strong>{PARTNER.name}</strong>
          <span>{PARTNER.text} →</span>
        </a>
        <p className="disclaimer">
          사주 풀이는 전통 명리 이론과 AI가 만든 참고용 해석입니다. 건강·법률·투자처럼 중요한 결정은 해당 분야
          전문가와 상의하세요.
        </p>
        <p className="footer-links">
          <Link to="/privacy">개인정보 처리방침</Link>
          <span>© {new Date().getFullYear()} {SITE.name}</span>
        </p>
      </footer>
    </div>
  );
}
