// 전체 메뉴 (2026-11-15 GNB 압축) — 상단 ☰ 전체를 누르면 모든 콘텐츠를 묶음별로 한 줄씩. 휴대폰은 아래에서 올라오는 시트.
// 누르면 메인 카드와 같은 방식으로 들어감: path 가 있으면 그 주소, 아니면 주제를 고르고 입력 화면(/start). 준비중은 안내만.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { GROUPS, CONTENTS, SOON_MESSAGE } from '../lib/contents.js';
import { PRICE_COIN } from '../lib/wallet.js';
import { saveTopic } from '../lib/storage.js';
import { trackEvent } from '../lib/analytics.js';
import { PriceTag } from './BokchaLink.jsx';

export default function AllMenu({ onClose, notify }) {
  const navigate = useNavigate();
  // 2026-11-19 사용자 지시: 한 번에 다 보여 주니 구별이 안 됨 → 위쪽 묶음 탭으로 한 묶음씩, 준비중은 맨 아래 한 줄로
  const [tab, setTab] = useState(GROUPS[0].id);
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
        <div className="all-menu-top">
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
          <div className="all-menu-tabs" role="tablist" aria-label="메뉴 묶음">
            {GROUPS.map((g) => (
              <button key={g.id} type="button" role="tab" aria-selected={tab === g.id} className={tab === g.id ? 'on' : ''} onClick={() => setTab(g.id)}>
                {g.label}
                <span>{CONTENTS.filter((c) => c.group === g.id && c.status === 'live').length}</span>
              </button>
            ))}
          </div>
        </div>
        {GROUPS.filter((g) => g.id === tab).map((g) => {
          const all = CONTENTS.filter((c) => c.group === g.id);
          const items = all.filter((c) => c.status === 'live');
          const soon = all.filter((c) => c.status !== 'live');
          return (
            <section key={g.id} className="all-menu-group" role="tabpanel">
              <ul>
                {items.map((c) => (
                  <li key={c.id}>
                    <button type="button" className={c.status === 'live' ? '' : 'is-soon'} onClick={() => open(c)}>
                      <span className="all-menu-glyph" aria-hidden="true">
                        {c.glyph}
                      </span>
                      <span className="all-menu-text">
                        <b>{c.title}</b>
                        <small>{c.desc}</small>
                      </span>
                      {c.status !== 'live' ? <em className="all-menu-tag is-soon">준비중</em> : PRICE_COIN[c.id] ? <PriceTag {...PRICE_COIN[c.id]} size={14} /> : <em className="all-menu-tag">무료</em>}
                    </button>
                  </li>
                ))}
              </ul>
              {soon.length > 0 && (
                <p className="all-menu-soon">
                  <span>준비 중</span>
                  {soon.map((c) => c.title).join(' · ')}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
