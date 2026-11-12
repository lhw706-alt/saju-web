import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { SITE, PARTNER } from '../site.js';
import { trackEvent } from '../lib/analytics.js';
import Logo from './Logo.jsx';
import { GROUPS } from '../lib/contents.js';

function setHeadTag(selector, create, update) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  update(el);
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    // 검색용: 주소마다 대표 주소(canonical) 지정, 개인 결과 화면은 색인 제외
    setHeadTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), (el) => {
      el.href = SITE.url + pathname;
    });
    setHeadTag('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' }), (el) => {
      el.content = pathname.startsWith('/result') ? 'noindex,follow' : 'index,follow';
    });
  }, [pathname]);

  return (
    <div className="app">
      <div className="sky" aria-hidden="true" />
      <header className="header">
        <Link to="/" className="brand" aria-label={`${SITE.name} 처음으로`}>
          <Logo size={22} />
        </Link>
        {/* GNB: 메인 카드 분류로 이동 (모바일은 헤더 아래 한 줄) */}
        <nav className="nav" aria-label="주요 메뉴">
          {GROUPS.map((g) => (
            <Link
              key={g.id}
              to={`/#${g.id}`}
              onClick={() => {
                if (pathname === '/') document.getElementById(g.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {g.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <a className="partner" href={PARTNER.url} target="_blank" rel="noopener" onClick={() => trackEvent('partner_click', { partner: 'damoapick' })}>
          <span className="partner-tag">함께 운영하는 서비스</span>
          <strong>{PARTNER.name}</strong>
          <span>{PARTNER.text} →</span>
        </a>
        <p className="disclaimer">
          천둥도사의 사주 풀이는 전통 명리 이론을 바탕으로 생성형 AI가 만든 참고용 해석입니다. 건강·법률·투자처럼
          중요한 결정은 해당 분야 전문가와 상의하세요.
        </p>
        <p className="footer-links">
          <Link to="/privacy">개인정보 처리방침</Link>
          <span>© {new Date().getFullYear()} {SITE.name}</span>
        </p>
      </footer>
    </div>
  );
}
