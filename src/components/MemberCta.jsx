// 비회원에게만 보이는 회원 혜택 카드 (결과 화면 끝 · 부적 도감) — 2026-11-13
// 로그인하면 Layout 이 이 브라우저의 풀이·도감을 계정으로 옮김 (syncLocalToAccount · syncBook)
import { useOutletContext } from 'react-router-dom';
import { LogoSymbol } from './Logo.jsx';
import { trackEvent } from '../lib/analytics.js';

export default function MemberCta({ title, text, reason, place }) {
  const { auth, openLogin } = useOutletContext();
  if (!auth.ready || auth.user) return null;
  return (
    <section className="member-cta">
      <span className="member-cta-face" aria-hidden="true">
        <LogoSymbol size={48} />
      </span>
      <div className="member-cta-text">
        <b>{title}</b>
        <p>{text}</p>
      </div>
      <button
        type="button"
        className="btn-primary inline"
        onClick={() => {
          trackEvent('member_cta', { place });
          openLogin(reason);
        }}
      >
        로그인하고 저장하기
      </button>
    </section>
  );
}
