import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SITE } from '../site.js';
import Logo from './Logo.jsx';
import { GROUPS } from '../lib/contents.js';
import FortuneFab from './FortuneFab.jsx';
import ContactModal from './ContactModal.jsx';
import LoginModal from './LoginModal.jsx';
import { clearInput } from '../lib/storage.js';
import { trackEvent } from '../lib/analytics.js';

function setHeadTag(selector, create, update) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  update(el);
}

export default function Layout() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [contact, setContact] = useState(false);
  const closeContact = useCallback(() => setContact(false), []);
  // 로그인 상태 (카카오 로그인 — 서버 /api/auth/me). enabled: 서버에 카카오 키가 설정됐는지
  const [auth, setAuth] = useState({ enabled: false, user: null, ready: false });
  const [login, setLogin] = useState(false);
  const [notice, setNotice] = useState('');
  const closeLogin = useCallback(() => setLogin(false), []);
  // 토스트: 4초 동안 보이고(마지막 0.4초는 CSS 로 흐려짐) 사라짐. 새 안내가 오면 처음부터 다시
  const noticeTimer = useRef(null);
  const showNotice = (text) => {
    clearTimeout(noticeTimer.current);
    setNotice({ text, key: Date.now() });
    noticeTimer.current = setTimeout(() => setNotice(''), 4000);
  };
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAuth({ enabled: !!d?.enabled, user: d?.user || null, ready: true }))
      .catch(() => setAuth((a) => ({ ...a, ready: true })));
  }, []);
  // 로그인하고 돌아왔을 때: GA 이벤트(new → sign_up, ok → login) / 실패·준비중 안내. 주소의 ?login=… 은 지움
  useEffect(() => {
    const m = search.match(/[?&]login=(\w+)/);
    if (!m) return undefined;
    const kind = m[1];
    // 같은 로그인 복귀에 이벤트가 두 번 가지 않게 (개발 모드 이중 실행·뒤로 가기 대비)
    if ((kind === 'new' || kind === 'ok') && !window.__scLoginTracked) {
      window.__scLoginTracked = true;
      if (kind === 'new') trackEvent('sign_up', { method: 'kakao' });
      trackEvent('login', { method: 'kakao' });
    }
    showNotice(
      kind === 'new'
        ? '반가워요! 카카오로 가입했어요.'
        : kind === 'ok'
          ? '로그인했어요.'
          : kind === 'unavailable'
            ? '로그인은 준비중이에요. 곧 열려요!'
            : '로그인하지 못했어요. 다시 시도해 주세요.'
    );
    navigate(pathname + search.replace(/[?&]login=\w+/, '').replace(/^&/, '?'), { replace: true });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setAuth((a) => ({ ...a, user: null }));
    showNotice('로그아웃했어요.');
  };
  // 회원 탈퇴: 저장된 회원 정보(회원번호·닉네임·가입일 등)를 지우고 로그아웃 → 성공하면 true
  const withdraw = async () => {
    if (!window.confirm('탈퇴하면 저장된 회원 정보가 지워져요. 탈퇴할까요?')) return false;
    const r = await fetch('/api/auth/delete', { method: 'POST' }).catch(() => null);
    const ok = !!r?.ok;
    if (ok) {
      trackEvent('withdraw', { method: 'kakao' });
      setAuth((a) => ({ ...a, user: null }));
      showNotice('탈퇴했어요. 카카오 연결은 카카오 설정에서 끊을 수 있어요.');
    } else showNotice('탈퇴하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    return ok;
  };
  useEffect(() => {
    window.scrollTo(0, 0);
    // 사주 화면(입력·결과)을 벗어나면 입력한 생년월일시를 지움 → 다음엔 처음부터 입력
    if (!pathname.startsWith('/start') && !pathname.startsWith('/result')) clearInput();
    // 검색용: 주소마다 대표 주소(canonical) 지정, 개인 결과 화면은 색인 제외
    setHeadTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), (el) => {
      el.href = SITE.url + pathname;
    });
    setHeadTag('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' }), (el) => {
      el.content = pathname.startsWith('/result') || pathname.startsWith('/admin') || pathname.startsWith('/my') ? 'noindex,nofollow' : 'index,follow';
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
        {/* 로그인 (로그인하면 닉네임 → 누르면 마이페이지) */}
        {auth.user ? (
          <Link to="/my" className="header-contact user-link" aria-label={`${auth.user.nick || '내 계정'} 마이페이지`}>
            {auth.user.nick || '내 계정'}
          </Link>
        ) : (
          <button type="button" className="header-contact" aria-haspopup="dialog" onClick={() => setLogin(true)}>
            로그인
          </button>
        )}
      </header>

      <main className="main">
        <Outlet context={{ auth, openLogin: () => setLogin(true), logout, withdraw, setNick: (nick) => setAuth((a) => ({ ...a, user: a.user ? { ...a.user, nick } : a.user })) }} />
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
      <LoginModal open={login} enabled={auth.enabled} onClose={closeLogin} />
      <div className="toast-wrap" role="status" aria-live="polite">
        {notice && (
          <p key={notice.key} className="toast">
            {notice.text}
          </p>
        )}
      </div>
    </div>
  );
}
