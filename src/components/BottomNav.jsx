// 휴대폰 하단 내비게이션 (2026-11-19 사용자 지시) — 559px 이하에서만 보임(styles.css .bnav), 그때 헤더 아래 메뉴 줄은 숨김.
// 칸: 사주 · 운세 · 행운 (메인의 그 묶음으로) · 별마루 · 마이(마이페이지 계정 정보 /my, 비회원은 로그인 창). 전체 메뉴(☰)는 오른쪽 위 머리로.
// 아이콘은 사이트 선 아이콘 규칙(24×24, 선 1.7, 둥근 끝 — GlassIcon 과 같음). 별마루 화면(.bm 전체 화면)에서는 그리지 않음.
import { Link, useLocation } from 'react-router-dom';
import { GROUPS } from '../lib/contents.js';

const ICON = {
  // 사주: 네 기둥(원국 여덟 칸)
  saju: 'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM7.5 4v16M12 4v16M16.5 4v16M3 12h18',
  // 운세: 초승달 + 별
  fortune: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5zM17 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  // 행운: 네잎클로버
  luck: 'M12 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM18 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM12 15a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM18 15a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM16.5 17.5 20 21',
  // 마이: 사람
  my: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.8-3.6 3.8-6 7.5-6s6.7 2.4 7.5 6',
};
const Icon = ({ d }) => (
  <svg className="bnav-ic" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

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
          <Icon d={ICON[g.id] || ICON.saju} />
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
        <Icon d={ICON.my} />
        <span className="bnav-label">마이</span>
      </Link>
    </nav>
  );
}
