// 상단 메뉴(GNB)의 복채 버튼 (2026-11-15 사용자 지시: 복주머니 모양 3D 아이콘으로 강조) → /wallet.
// 아이콘은 그라데이션·빛·그림자로 입체감을 준 SVG 복주머니(붉은 비단 + 금 끈 + 福 금장).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function PouchIcon({ size = 30 }) {
  return (
    <svg className="pouch-ic" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <radialGradient id="pch-body" cx="38%" cy="40%" r="70%">
          <stop offset="0" stopColor="#F2675C" />
          <stop offset="0.45" stopColor="#C42C24" />
          <stop offset="1" stopColor="#5E0D0C" />
        </radialGradient>
        <radialGradient id="pch-top" cx="45%" cy="35%" r="75%">
          <stop offset="0" stopColor="#EE5A50" />
          <stop offset="1" stopColor="#8A1814" />
        </radialGradient>
        <linearGradient id="pch-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF0BF" />
          <stop offset="0.5" stopColor="#E2C27A" />
          <stop offset="1" stopColor="#9C7429" />
        </linearGradient>
        <radialGradient id="pch-seal" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#FFF3C9" />
          <stop offset="0.55" stopColor="#E7C77F" />
          <stop offset="1" stopColor="#A57B2C" />
        </radialGradient>
      </defs>
      <ellipse cx="24" cy="44" rx="12" ry="2.4" fill="#000" opacity="0.35" />
      {/* 위쪽 주름 */}
      <path d="M17.5 17.5C14.5 13 15.2 8.6 18.4 9.4C19.8 6.4 23 6.8 24 9.2C25 6.8 28.2 6.4 29.6 9.4C32.8 8.6 33.5 13 30.5 17.5Z" fill="url(#pch-top)" />
      <path d="M19.5 10.6C20.6 9.4 22 9.6 22.6 11" stroke="#FF9C8F" strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* 몸통 */}
      <path d="M16.6 17.4C9.4 22 7.2 30.8 10.2 37C13 42.6 35 42.6 37.8 37C40.8 30.8 38.6 22 31.4 17.4Z" fill="url(#pch-body)" />
      <ellipse cx="17.6" cy="26" rx="3.6" ry="6.4" fill="#fff" opacity="0.22" transform="rotate(18 17.6 26)" />
      {/* 금 끈 */}
      <rect x="15.4" y="15.6" width="17.2" height="3.4" rx="1.7" fill="url(#pch-gold)" />
      <path d="M22 18.8C20.4 21.6 19.2 23.2 17.4 24.2M26 18.8C27.6 21.6 28.8 23.2 30.6 24.2" stroke="url(#pch-gold)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="17.3" r="1.9" fill="url(#pch-seal)" />
      {/* 福 금장 */}
      <circle cx="24" cy="31" r="6.6" fill="url(#pch-seal)" />
      <circle cx="24" cy="31" r="5.4" fill="none" stroke="#9C7429" strokeWidth="0.6" />
      <text x="24" y="34.3" textAnchor="middle" fontSize="8.6" fontFamily="ChosunSm, serif" fill="#7A1410">
        福
      </text>
      {/* 반짝임 */}
      <path className="pouch-spark" d="M38.5 8.5l0.9 2.3 2.3 0.9-2.3 0.9-0.9 2.3-0.9-2.3-2.3-0.9 2.3-0.9z" fill="#FFE9A8" />
    </svg>
  );
}

// 금전(복채 단위) 3D 아이콘 (2026-11-15 사용자 지시) — 네모 구멍 뚫린 금 엽전. 두께(아래 옆면)·테두리·빛 반사로 입체감, 天文金錢 돋을새김.
export function CoinIcon({ size = 30 }) {
  return (
    <svg className="coin-ic" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <radialGradient id="coin-face" cx="36%" cy="30%" r="80%">
          <stop offset="0" stopColor="#FFF6D2" />
          <stop offset="0.4" stopColor="#F0CF7E" />
          <stop offset="1" stopColor="#B5862E" />
        </radialGradient>
        <linearGradient id="coin-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7A5518" />
          <stop offset="0.5" stopColor="#A9792A" />
          <stop offset="1" stopColor="#6B4913" />
        </linearGradient>
        <linearGradient id="coin-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF0C0" />
          <stop offset="1" stopColor="#9C7026" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="44.2" rx="13" ry="2.2" fill="#000" opacity="0.35" />
      {/* 옆면(두께) */}
      <circle cx="24" cy="25.6" r="17" fill="url(#coin-side)" />
      {/* 앞면 */}
      <circle cx="24" cy="23" r="17" fill="url(#coin-face)" />
      <circle cx="24" cy="23" r="16.3" fill="none" stroke="url(#coin-rim)" strokeWidth="1.4" />
      <circle cx="24" cy="23" r="13.4" fill="none" stroke="#A87A2A" strokeWidth="0.9" opacity="0.8" />
      {/* 네모 구멍 (안쪽 그림자 + 금 테두리) */}
      <rect x="19.6" y="18.6" width="8.8" height="8.8" rx="0.8" fill="#2A1E0E" />
      <path d="M19.6 27.4V18.6H28.4" fill="none" stroke="#6E4B14" strokeWidth="0.9" />
      <path d="M28.4 18.6V27.4H19.6" fill="none" stroke="#FFE7A6" strokeWidth="0.9" />
      {/* 돋을새김 글자 */}
      <g fontFamily="ChosunSm, serif" fontSize="6.4" fill="#8A6020" textAnchor="middle">
        <text x="24" y="16.6">天</text>
        <text x="24" y="34.4">文</text>
        <text x="32.6" y="25.4">金</text>
        <text x="15.4" y="25.4">錢</text>
      </g>
      {/* 빛 반사 */}
      <path d="M11.6 17.4A13.6 13.6 0 0 1 21 9.6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
      <path className="coin-spark" d="M39 6.5l0.9 2.3 2.3 0.9-2.3 0.9-0.9 2.3-0.9-2.3-2.3-0.9 2.3-0.9z" fill="#FFE9A8" />
    </svg>
  );
}

// 금전 아이콘 + 숫자 (예: 엽전 350) — 금액 표시는 이걸로 (2026-11-15 사용자 지시)
export function Coins({ n, size = 20, sign = false, className = '' }) {
  const v = Number(n || 0);
  return (
    <span className={`coins ${className}`.trim()} aria-label={`${v.toLocaleString('ko-KR')}금전`}>
      <CoinIcon size={size} />
      <b>{sign && v > 0 ? '+' : ''}{v.toLocaleString('ko-KR')}</b>
    </span>
  );
}
// 유료 가격표: 엽전 + 숫자 (+ '부터'). 메인 카드 배지·주제 칩·장수 버튼 등 — 무료 배지와 확실히 구분 (2026-11-15 사용자 지시)
export function PriceTag({ n, from = false, size = 16, className = '' }) {
  return (
    <span className={`price-tag ${className}`.trim()} aria-label={`${n}금전${from ? '부터' : ''}`}>
      <CoinIcon size={size} />
      <b>{n}</b>
      {from && <small>부터</small>}
    </span>
  );
}

// 잔액이 바뀌면 화면 어디서든 window 에 'saju:wallet' 이벤트(detail.balance)를 보내 GNB 숫자를 맞춤
export const announceBalance = (balance) => {
  if (typeof balance === 'number') window.dispatchEvent(new CustomEvent('saju:wallet', { detail: { balance } }));
};

// GNB 복채 버튼 (2026-11-15 사용자 지시: 글자 없이 엽전 아이콘 + 남은 금전 숫자만, 비회원은 엽전만)
export default function BokchaLink({ member = false }) {
  const [bal, setBal] = useState(null);
  useEffect(() => {
    if (!member) return setBal(null);
    let alive = true;
    fetch('/api/wallet', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && typeof d.balance === 'number' && setBal(d.balance))
      .catch(() => {});
    const on = (e) => typeof e.detail?.balance === 'number' && setBal(e.detail.balance);
    window.addEventListener('saju:wallet', on);
    return () => {
      alive = false;
      window.removeEventListener('saju:wallet', on);
    };
  }, [member]);
  return (
    <Link to="/wallet" className="bokcha-link" aria-label={bal === null ? '복채 충전' : `복채 충전, 남은 금전 ${bal}`}>
      <span className="bokcha-pill">
        <CoinIcon size={22} />
        {bal !== null && <b>{bal.toLocaleString('ko-KR')}</b>}
      </span>
    </Link>
  );
}
