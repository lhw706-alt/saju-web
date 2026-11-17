import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SITE } from '../site.js';
import Logo from './Logo.jsx';
import { GROUPS } from '../lib/contents.js';
import FortuneFab from './FortuneFab.jsx';
import ContactModal from './ContactModal.jsx';
import LoginModal from './LoginModal.jsx';
import UserMenu from './UserMenu.jsx';
import BokchaLink from './BokchaLink.jsx';
import AllMenu from './AllMenu.jsx';
import { syncLocalToAccount } from '../lib/history.js';
import { syncBook } from '../lib/fortunes.js';
import { clearInput } from '../lib/storage.js';
import { trackEvent } from '../lib/analytics.js';
import ConfirmHost, { askConfirm, showAlert } from './ConfirmHost.jsx';

function setHeadTag(selector, create, update) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  update(el);
}

// PC 상단 메뉴 (1281px 이상, 압축 전 원래 버전)
const PC_NAV = [
  { label: '사주', to: 'saju' },
  { label: '운세', to: 'fortune' },
  { label: '궁합', to: 'card-match' },
  { label: '행운', to: 'luck' },
  { label: '풀이', to: 'card-tarot' },
];

export default function Layout() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [allMenu, setAllMenu] = useState(false); // 전체 메뉴 창
  const [contact, setContact] = useState(false);
  const closeContact = useCallback(() => setContact(false), []);
  // 로그인 상태 (카카오 로그인 — 서버 /api/auth/me). enabled: 서버에 카카오 키가 설정됐는지
  const [auth, setAuth] = useState({ enabled: false, user: null, ready: false });
  const [login, setLogin] = useState(false);
  const [loginReason, setLoginReason] = useState(''); // 로그인 창 맨 위 안내 (천둥도사 말투)
  const askLogin = (reason = '') => {
    setLoginReason(reason);
    setLogin(true);
  };
  const [notice, setNotice] = useState('');
  // 로그인 창을 그냥 닫으면 '로그인 뒤 문의 창 열기' 예약도 취소
  const closeLogin = useCallback(() => {
    setLogin(false);
    setLoginReason('');
    try {
      sessionStorage.removeItem('sc:afterLogin');
    } catch {}
  }, []);
  // 토스트: 4초 동안 보이고(마지막 0.4초는 CSS 로 흐려짐) 사라짐. 새 안내가 오면 처음부터 다시
  const noticeTimer = useRef(null);
  // tone: 'positive'(초록 체크) · 'negative'(빨간 느낌표) · 없으면 아이콘 없이 (Montage Toast)
  const showNotice = (text, tone) => {
    clearTimeout(noticeTimer.current);
    setNotice({ text, tone, key: Date.now() });
    noticeTimer.current = setTimeout(() => setNotice(''), 4000);
  };
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  // 로그인하면 이 브라우저에서 비회원으로 본 풀이·모은 부적을 계정으로 옮김 (로그인마다 한 번)
  const synced = useRef(false);
  useEffect(() => {
    if (!auth.user) {
      synced.current = false;
      return;
    }
    if (synced.current) return;
    synced.current = true;
    syncLocalToAccount();
    syncBook();
  }, [auth.user]);
  // 문의하기는 로그인 회원만: 비로그인이면 로그인 창부터 → 로그인하면 문의 창을 이어서 엶
  // (카카오 로그인은 페이지를 떠났다 오므로 sessionStorage 로 기억)
  const [inquiryVer, setInquiryVer] = useState(0); // 문의를 보내면 +1 → 마이페이지 목록 새로 읽기
  const openContact = () => {
    if (auth.user) return setContact(true);
    try {
      sessionStorage.setItem('sc:afterLogin', 'contact');
    } catch {}
    askLogin('천둥도사에게 문의를 남기려면 로그인이 필요해요.');
  };
  useEffect(() => {
    if (!auth.user) return;
    // 'fortune'(카카오 공유하려다 로그인)은 FortuneFab 이 처리
    let want = null;
    try {
      want = sessionStorage.getItem('sc:afterLogin');
      if (want === 'contact') sessionStorage.removeItem('sc:afterLogin');
    } catch {}
    if (want === 'contact') setContact(true);
  }, [auth.user]);
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAuth({ enabled: !!d?.enabled, emailEnabled: !!d?.emailEnabled, user: d?.user || null, ready: true }))
      .catch(() => setAuth((a) => ({ ...a, ready: true })));
  }, []);
  // 로그인하고 돌아왔을 때: GA 이벤트(new → sign_up, ok → login) / 실패·준비중 안내. 주소의 ?login=… 은 지움
  useEffect(() => {
    const m = search.match(/[?&]login=(\w+)/);
    if (!m) return undefined;
    const kind = m[1];
    const method = /[?&]via=email/.test(search) ? 'email' : 'kakao';
    // 같은 로그인 복귀에 이벤트가 두 번 가지 않게 (개발 모드 이중 실행·뒤로 가기 대비)
    if ((kind === 'new' || kind === 'ok') && !window.__scLoginTracked) {
      window.__scLoginTracked = true;
      if (kind === 'new') trackEvent('sign_up', { method });
      trackEvent('login', { method });
    }
    if (kind === 'new' || kind === 'ok') {
      // 이메일 인증으로 막 가입한 경우 등: 로그인 상태 다시 읽기
      fetch('/api/auth/me', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setAuth({ enabled: !!d.enabled, emailEnabled: !!d.emailEnabled, user: d.user || null, ready: true }))
        .catch(() => {});
    }
    showNotice(
      kind === 'new'
        ? method === 'email'
          ? '반가워요! 이메일 인증을 마치고 가입했어요.'
          : '반가워요! 카카오로 가입했어요.'
        : kind === 'ok'
          ? '로그인했어요.'
          : kind === 'reset'
            ? '비밀번호를 새로 정하고 로그인했어요.'
          : kind === 'expired'
            ? '인증 링크가 만료됐거나 이미 쓴 링크예요. 다시 가입해 주세요.'
            : kind === 'exists'
              ? '이미 가입한 이메일이에요. 로그인해 주세요.'
              : kind === 'unavailable'
                ? '로그인은 준비중이에요. 곧 열려요!'
                : '로그인하지 못했어요. 다시 시도해 주세요.'
    );
    navigate(pathname + search.replace(/[?&]login=\w+/, '').replace(/[?&]via=\w+/, '').replace(/^&/, '?'), { replace: true });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setAuth((a) => ({ ...a, user: null }));
    showNotice('로그아웃했어요.', 'positive');
  };
  // 만 14세 이상 확인 (2026-11-16, 개인정보보호법 제22조의2): 카카오로 처음 가입했거나 예전 회원(ageOk false)에게 한 번 묻기.
  // 아니라고 하면 가입을 취소(탈퇴)함. 창 바깥을 눌러 닫으면 다시 물어봄(실수로 탈퇴되지 않게).
  const askedAge = useRef(false);
  useEffect(() => {
    if (!auth.user || auth.user.ageOk !== false || askedAge.current) return;
    askedAge.current = true;
    (async () => {
      for (;;) {
        const yes = await askConfirm({ title: '만 14세 이상인가요?', message: '사주천문은 만 14세 이상만 회원으로 가입할 수 있어요.', note: '처음 한 번만 확인해요.', ok: '네, 만 14세 이상이에요', cancel: '아니요' });
        if (yes) {
          await fetch('/api/auth/age', { method: 'POST' }).catch(() => {});
          setAuth((a) => ({ ...a, user: a.user ? { ...a.user, ageOk: true } : a.user }));
          return;
        }
        const quit = await askConfirm({ title: '가입을 취소할까요?', message: '만 14세 미만은 회원으로 가입할 수 없어요. 가입을 취소하면 계정 정보가 지워져요. 회원이 아니어도 무료 사주와 운세는 볼 수 있어요.', ok: '가입 취소', cancel: '다시 확인할게요' });
        if (quit) {
          await fetch('/api/auth/delete', { method: 'POST' }).catch(() => {});
          setAuth((a) => ({ ...a, user: null }));
          showNotice('가입을 취소했어요.');
          return;
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.ageOk]);
  // 회원 탈퇴: 저장된 회원 정보(회원번호·닉네임·가입일 등)를 지우고 로그아웃 → 성공하면 true
  const withdraw = async () => {
    // 남은 금전이 있으면 먼저 알림 (2026-11-17 — 탈퇴 전 환불 요청 기회를 줌, 이용약관 제7조의3)
    const bal = await fetch('/api/wallet', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const left = Number(bal?.balance) || 0;
    if (left > 0 && !await askConfirm({
      title: `남은 금전 ${left.toLocaleString('ko-KR')}금전이 있어요`,
      message: '탈퇴하면 남은 금전이 사라져요. 직접 충전한 금전은 탈퇴하기 전에 고객센터로 환불을 요청할 수 있어요.',
      ok: '그래도 탈퇴하기',
      cancel: '돌아가기',
    })) return false;
    if (!await askConfirm('탈퇴하면 저장된 회원 정보가 지워져요. 탈퇴할까요?')) return false;
    const r = await fetch('/api/auth/delete', { method: 'POST' }).catch(() => null);
    const ok = !!r?.ok;
    if (ok) {
      trackEvent('withdraw', { method: auth.user?.provider || 'kakao' });
      setAuth((a) => ({ ...a, user: null }));
      showNotice(auth.user?.provider === 'email' ? '탈퇴했어요. 그동안 고마웠어요.' : '탈퇴했어요. 카카오 연결은 카카오 설정에서 끊을 수 있어요.');
    } else showNotice('탈퇴하지 못했어요. 잠시 뒤 다시 시도해 주세요.', 'negative');
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
      el.content = pathname.startsWith('/result') || pathname.startsWith('/admin') || pathname.startsWith('/my') || pathname.startsWith('/reset') || pathname.startsWith('/match/') ? 'noindex,nofollow' : 'index,follow';
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
          {/* PC(1281px 이상)는 원래 메뉴 5개 (2026-11-15 사용자 지시) — 궁합·풀이는 메인의 그 카드로 */}
          {PC_NAV.map((n) => (
            <Link
              key={n.to}
              className="nav-pc"
              to={`/#${n.to}`}
              onClick={() => {
                if (pathname === '/') document.getElementById(n.to)?.scrollIntoView({ behavior: 'smooth', block: n.to.startsWith('card-') ? 'center' : 'start' });
              }}
            >
              {n.label}
            </Link>
          ))}
          {GROUPS.map((g) => (
            <Link
              key={g.id}
              className="nav-m"
              to={`/#${g.id}`}
              onClick={() => {
                if (pathname === '/') document.getElementById(g.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {g.nav || g.label}
            </Link>
          ))}
          {/* 별마루 (2026-11-15 사용자 지시: GNB 진입, 조금 특별하게 — 반짝이는 별 + 금빛 글자) */}
          <Link to="/byeolmaru" className={`nav-bm${pathname === '/byeolmaru' ? ' on' : ''}`} aria-label="별마루 — 밤하늘 마당에 들어가기">
            <svg className="nav-bm-star" width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 1.5l2.2 7.3 7.3 2.2-7.3 2.2L12 22.5l-2.2-9.3L2.5 11l7.3-2.2z" fill="currentColor" />
            </svg>
            <span>별마루</span>
          </Link>
          {/* 전체 메뉴: 모든 콘텐츠를 묶음별로 한눈에 (2026-11-15 GNB 압축) */}
          <button type="button" className="nav-all" onClick={() => setAllMenu(true)} aria-haspopup="dialog" aria-label="전체 메뉴 열기">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
            <span className="nav-all-text">전체</span>
          </button>
        </nav>
        {/* 복채(복주머니) + 로그인 (로그인하면 닉네임 → 누르면 마이페이지) */}
        <div className="header-actions">
        <BokchaLink member={Boolean(auth.user)} />
        {auth.user ? (
          <UserMenu nick={auth.user.nick} onLogout={() => logout().then(() => pathname.startsWith('/my') && navigate('/'))} />
        ) : (
          <button type="button" className="header-contact" aria-haspopup="dialog" onClick={() => setLogin(true)}>
            로그인
          </button>
        )}
        </div>
      </header>

      <main className="main">
        <Outlet context={{ auth, openLogin: (reason) => askLogin(typeof reason === 'string' ? reason : ''), notify: showNotice, openContact, inquiryVer, logout, withdraw, setNick: (nick) => setAuth((a) => ({ ...a, user: a.user ? { ...a.user, nick } : a.user })) }} />
      </main>
      <FortuneFab
        loggedIn={!!auth.user}
        onNeedLogin={(msg) => askLogin(msg)}
        onNotice={showNotice}
      />

      <footer className="footer">
        <p className="footer-links">
          <span className="footer-menu">
            <button type="button" className="footer-contact" aria-haspopup="dialog" onClick={openContact}>
              문의하기
            </button>
            <Link to="/dict">사주 용어 사전</Link>
            <Link to="/terms">이용약관</Link>
            <Link to="/terms#refund">환불 정책</Link>
            <Link to="/privacy">개인정보 처리방침</Link>
          </span>
          <span>© {new Date().getFullYear()} {SITE.name}</span>
        </p>
        {/* 사업자 정보 (2026-11-14) — src/site.js SITE.business */}
        <p className="footer-biz">
          <span>운영 {SITE.business.name}</span>
          <span>대표 {SITE.business.ceo}</span>
          <span>사업자등록번호 {SITE.business.regNo}</span>
          <span>주소 {SITE.business.address}</span>
          <span>전화 {SITE.business.phone}</span>
          <span>이메일 {SITE.business.email}</span>
          <span>호스팅 제공자 {SITE.business.hosting}</span>
        </p>
      </footer>
      <ConfirmHost />
      {allMenu && <AllMenu onClose={() => setAllMenu(false)} notify={showNotice} />}
      <ContactModal
        open={contact}
        onClose={closeContact}
        onSent={() => setInquiryVer((v) => v + 1)}
        onNeedLogin={() => {
          // 로그인이 풀린 채로 보낸 경우
          setContact(false);
          setAuth((a) => ({ ...a, user: null }));
          openContact();
        }}
      />
      <LoginModal
        open={login}
        enabled={auth.enabled}
        emailEnabled={auth.emailEnabled}
        reason={loginReason}
        onClose={closeLogin}
        onLoggedIn={(nick) => {
          trackEvent('login', { method: 'email' });
          setAuth((a) => ({ ...a, user: { nick, provider: 'email' } }));
          setLogin(false);
          showNotice('로그인했어요.', 'positive');
        }}
      />
      <div className="toast-wrap" role="status" aria-live="polite">
        {notice && (
          <p key={notice.key} className={`toast${notice.tone ? ` is-${notice.tone}` : ''}`}>
            {notice.tone === 'positive' && (
              <svg className="toast-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="var(--positive)" />
                <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {notice.tone === 'negative' && (
              <svg className="toast-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="var(--danger)" />
                <path d="M12 7v6M12 16.5v.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            {notice.text}
          </p>
        )}
      </div>
    </div>
  );
}
