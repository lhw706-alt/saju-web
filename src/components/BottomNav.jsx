// 휴대폰 하단 내비게이션 (2026-11-19 사용자 지시) — 559px 이하에서만 보임(styles.css .bnav), 그때 헤더 아래 메뉴 줄은 숨김.
// 칸: 사주 · 운세 · 행운 (메인의 그 묶음으로) · 별마루 · 전체(전체 메뉴 시트). 홈은 위쪽 로고.
// 아이콘은 이모지 대신 사이트 한자(조선신명조)와 선 아이콘. 별마루 화면(.bm 전체 화면)에서는 그리지 않음.
import { Link, useLocation } from 'react-router-dom';
import { GROUPS } from '../lib/contents.js';

const GLYPH = { saju: '命', fortune: '運', luck: '福' };

export default function BottomNav({ onAll, allOpen }) {
  const { pathname, hash } = useLocation();
  if (pathname === '/byeolmaru') return null;
  const go = (id) => () => {
    if (pathname === '/') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <nav className="bnav" aria-label="하단 메뉴">
      {GROUPS.map((g) => (
        <Link key={g.id} to={`/#${g.id}`} onClick={go(g.id)} className={pathname === '/' && hash === `#${g.id}` ? 'on' : ''}>
          <span className="bnav-ic bnav-glyph" aria-hidden="true">
            {GLYPH[g.id] || '文'}
          </span>
          <span className="bnav-label">{g.nav || g.label}</span>
        </Link>
      ))}
      <Link to="/byeolmaru" className="bnav-bm" aria-label="별마루 — 밤하늘 마당에 들어가기">
        <svg className="bnav-ic" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 1.5l2.2 7.3 7.3 2.2-7.3 2.2L12 22.5l-2.2-9.3L2.5 11l7.3-2.2z" fill="currentColor" />
        </svg>
        <span className="bnav-label">별마루</span>
      </Link>
      <button type="button" className={allOpen ? 'on' : ''} onClick={onAll} aria-haspopup="dialog" aria-label="전체 메뉴 열기">
        <svg className="bnav-ic" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
        <span className="bnav-label">전체</span>
      </button>
    </nav>
  );
}
