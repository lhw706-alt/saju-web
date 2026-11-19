// 휴대폰 하단 내비게이션 (2026-11-19 사용자 지시) — 559px 이하에서만 보임(styles.css .bnav), 그때 헤더 아래 메뉴 줄은 숨김.
// 칸: 사주 · 운세 · 행운 (메인의 그 묶음으로) · 별마루 · 마이(마이페이지 계정 정보 /my, 비회원은 로그인 창). 전체 메뉴(☰)는 오른쪽 위 머리로.
// 아이콘은 사이트 선 아이콘 규칙(24×24, 선 1.7, 둥근 끝 — GlassIcon 과 같음). 별마루 화면(.bm 전체 화면)에서는 그리지 않음.
import { Link, useLocation } from 'react-router-dom';
import { GROUPS } from '../lib/contents.js';
import MenuIcon from './MenuIcon.jsx';


export default function BottomNav({ member, onLogin }) {
  const { pathname, hash } = useLocation();
  if (pathname === '/byeolmaru') return null;
  const go = (id) => () => {
    if (pathname === '/') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <nav className="bnav" aria-label="하단 메뉴">
      {GROUPS.map((g) => (
        <Link key={g.id} to={`/#${g.id}`} onClick={go(g.id)} className={pathname === '/' && hash === `#${g.id}` ? 'on' : ''}>
          <MenuIcon id={g.id} className="bnav-ic" />
          <span className="bnav-label">{g.nav || g.label}</span>
        </Link>
      ))}
      <Link to="/byeolmaru" className="bnav-bm" aria-label="별마루 — 밤하늘 마당에 들어가기">
        <svg className="bnav-ic" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l2.1 7 7 2.1-7 2.1L12 22l-2.1-8.8L3 11.1l7-2.1z" fill="currentColor" />
        </svg>
        <span className="bnav-label">별마루</span>
      </Link>
      <Link
        to="/my"
        className={pathname.startsWith('/my') ? 'on' : ''}
        onClick={(e) => {
          if (member === false) {
            e.preventDefault();
            onLogin?.();
          }
        }}
        aria-label="마이페이지"
      >
        <MenuIcon id="my" className="bnav-ic" />
        <span className="bnav-label">마이</span>
      </Link>
    </nav>
  );
}
