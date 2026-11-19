// 전체 메뉴 (2026-11-15 GNB 압축) — 머리 ☰를 누르면 모든 콘텐츠를 한 화면에. 휴대폰은 아래에서 올라오는 시트.
// 2026-11-19 사용자 지시: 묶음 탭 대신 한 화면에 여러 묶음 — 묶음마다 4칸 타일(선 아이콘 · 이름 · 유료면 가격), 설명·무료 표시는 뺌. 준비중은 맨 아래 한 줄.
// 누르면 메인 카드와 같은 방식으로 들어감: path 가 있으면 그 주소, 아니면 주제를 고르고 입력 화면(/start).
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { GROUPS, CONTENTS, SOON_MESSAGE } from '../lib/contents.js';
import { PRICE_COIN } from '../lib/wallet.js';
import { saveTopic } from '../lib/storage.js';
import { trackEvent } from '../lib/analytics.js';
import { PriceTag } from './BokchaLink.jsx';
import MenuIcon from './MenuIcon.jsx';

export default function AllMenu({ onClose, notify }) {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const open = (c) => {
    if (c.status !== 'live') return notify?.(`${c.title} — ${SOON_MESSAGE[c.status]}`);
    trackEvent('content_click', { content: c.id, from: 'all_menu' });
    onClose();
    if (c.path) return navigate(c.path);
    if (c.topic) saveTopic(c.topic);
    navigate('/start');
  };

  return createPortal(
    <div className="contact-overlay all-menu-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="all-menu" role="dialog" aria-modal="true" aria-labelledby="all-menu-title">
        <div className="contact-head">
          <h2 id="all-menu-title" className="contact-title">
            전체 메뉴
          </h2>
          <button type="button" className="fortune__close" aria-label="닫기" onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {GROUPS.map((g) => {
          const all = CONTENTS.filter((c) => c.group === g.id);
          const items = all.filter((c) => c.status === 'live');
          return (
            <section key={g.id} className="am-group" aria-labelledby={`am-${g.id}`}>
              <h3 id={`am-${g.id}`}>
                <MenuIcon id={g.id} size={16} />
                {g.label}
              </h3>
              <ul className="am-grid">
                {items.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => open(c)}>
                      <span className="am-ic">
                        <MenuIcon id={c.id} size={20} />
                      </span>
                      <b>{c.title}</b>
                      {PRICE_COIN[c.id] && <PriceTag {...PRICE_COIN[c.id]} size={12} />}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <p className="am-soon">
          <span>준비 중</span>
          {CONTENTS.filter((c) => c.status !== 'live').map((c) => c.title).join(' · ')}
        </p>
      </div>
    </div>,
    document.body
  );
}
