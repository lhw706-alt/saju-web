// 상단 오른쪽 닉네임 버튼 → 펼침 메뉴: 마이페이지 · 1:1 문의(마이페이지 고객센터 탭) · 로그아웃 (2026-11-13)
// 바깥을 누르거나 Esc, 메뉴를 고르면 닫힘. 위아래 화살표로 항목 이동.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function UserMenu({ nick, onLogout }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const btn = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const items = () => [...(wrap.current?.querySelectorAll('[role="menuitem"]') || [])];
    setTimeout(() => items()[0]?.focus(), 0);
    const onDown = (e) => {
      if (!wrap.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btn.current?.focus();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const list = items();
        const i = list.indexOf(document.activeElement);
        list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={wrap}>
      <button
        ref={btn}
        type="button"
        className="header-contact user-menu-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {nick || '내 계정'}
      </button>
      {open && (
        <div className="user-menu-list" role="menu" aria-label="내 계정 메뉴">
          <Link role="menuitem" to="/my" onClick={() => setOpen(false)}>
            마이페이지
          </Link>
          <Link role="menuitem" to="/wallet" onClick={() => setOpen(false)}>
            복채 충전
          </Link>
          <Link role="menuitem" to="/my/support" onClick={() => setOpen(false)}>
            1:1 문의
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
