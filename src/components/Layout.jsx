import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { SITE } from '../site.js';
import Logo from './Logo.jsx';
import { GROUPS } from '../lib/contents.js';
import FortuneFab from './FortuneFab.jsx';
import ContactModal from './ContactModal.jsx';

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
  const [contact, setContact] = useState(false);
  const closeContact = useCallback(() => setContact(false), []);
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
          <Logo size={34} />
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
        <button type="button" className="header-contact" aria-haspopup="dialog" onClick={() => setContact(true)}>
          문의하기
        </button>
      </header>

      <main className="main">
        <Outlet />
      </main>
      <FortuneFab />

      <footer className="footer">
        <p className="footer-links">
          <span className="footer-menu">
            <button type="button" className="footer-contact" aria-haspopup="dialog" onClick={() => setContact(true)}>
              문의하기
            </button>
            <Link to="/privacy">개인정보 처리방침</Link>
          </span>
          <span>© {new Date().getFullYear()} {SITE.name}</span>
        </p>
      </footer>
      <ContactModal open={contact} onClose={closeContact} />
    </div>
  );
}
