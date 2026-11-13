// 로그인 창: 이메일·비밀번호 로그인 + 카카오 간편 로그인(노란 동그라미) / 이메일 회원가입 / 인증 메일 보냄
// 서버: netlify/functions/auth.mjs. 카카오 버튼은 카카오 디자인 가이드 색(#FEE500)과 말풍선 심볼
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { LogoSymbol } from './Logo.jsx';
import PasswordInput from './PasswordInput.jsx';
import { passwordOk } from '../lib/password.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// 닉네임 규칙 (서버 cleanNick 과 같음)
const nickError = (v) => {
  const n = v.replace(/\s+/g, ' ').trim();
  if ([...n].length < 2 || [...n].length > 12) return '닉네임은 2~12자로 정해 주세요.';
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 ._\-~♡★☆]+$/u.test(n)) return '한글·영문·숫자와 . _ - ~ ♡ ★ 만 쓸 수 있어요.';
  return '';
};

function KakaoSymbol({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#000" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.66 6.77l-.95 3.48c-.08.3.26.54.52.37l4.13-2.74c.54.08 1.08.12 1.64.12 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
    </svg>
  );
}

// reason: 로그인을 권하는 이유 (예: 비회원 3번째 사주) — 창 맨 위에 천동이와 함께 보여 줌
export default function LoginModal({ open, enabled, emailEnabled, onClose, onLoggedIn, reason = '' }) {
  const { pathname, search } = useLocation();
  const panel = useRef(null);
  const [view, setView] = useState('login'); // login | signup | sent | find | findSent
  const [keep, setKeep] = useState(true); // 자동 로그인 (끄면 브라우저를 닫을 때 로그아웃)
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [nick, setNick] = useState('');
  const [suggest, setSuggest] = useState('천둥의 별빛 7');
  const [err, setErr] = useState({ field: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false); // 이메일 칸을 한 번 벗어난 뒤부터 형식 안내

  useEffect(() => {
    if (!open) return undefined;
    setView('login');
    setErr({ field: '', text: '' });
    setPw('');
    setPw2('');
    const prev = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => panel.current?.querySelector('input')?.focus(), 0);
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  // 회원가입 화면을 열면 비어 있는 랜덤 닉네임을 회색으로 보여 줌
  useEffect(() => {
    // 화면을 바꿀 때 비밀번호·오류는 비움 (이메일은 그대로 이어서)
    setPw('');
    setPw2('');
    setErr({ field: '', text: '' });
    setEmailBlurred(false);
    if (view !== 'signup') return;
    setNick('');
    fetch('/api/auth/nickname/suggest', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.nick && setSuggest(d.nick))
      .catch(() => {});
    setTimeout(() => panel.current?.querySelector('input')?.focus(), 0);
  }, [view]);

  if (!open) return null;
  const next = `${pathname}${search.replace(/[?&]login=\w+/, '')}`;
  // 입력하는 동안 바로 보여 주는 안내 (회원가입 화면). 서버가 돌려준 오류가 있으면 그걸 먼저
  const live =
    view === 'signup'
      ? {
          email: emailBlurred && email.trim() && !EMAIL_RE.test(email.trim()) ? '이메일 주소 형식을 확인해 주세요.' : '',
          password2: pw2 && pw !== pw2 ? '비밀번호가 서로 달라요.' : '',
          nick: nick.trim() ? nickError(nick) : '',
        }
      : {};
  const fieldErr = (f) => (err.field === f ? err.text : live[f] || '');

  const post = async (url, body) => {
    setBusy(true);
    setErr({ field: '', text: '' });
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r?.ok) {
      setErr({ field: d?.field || '', text: d?.error || '잠시 뒤 다시 시도해 주세요.' });
      return null;
    }
    return d;
  };

  const login = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setErr({ field: 'email', text: '이메일 주소를 확인해 주세요.' });
    if (!pw) return setErr({ field: 'password', text: '비밀번호를 넣어 주세요.' });
    const d = await post('/api/auth/email/login', { email, password: pw, keep });
    if (d) onLoggedIn(d.nick);
  };

  const find = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setErr({ field: 'email', text: '이메일 주소를 확인해 주세요.' });
    const d = await post('/api/auth/email/reset-request', { email });
    if (d) setView('findSent');
  };

  const signup = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setErr({ field: 'email', text: '이메일 주소를 확인해 주세요.' });
    if (!passwordOk(pw)) return setErr({ field: 'password', text: '비밀번호 조건을 모두 맞춰 주세요.' });
    if (pw !== pw2) return setErr({ field: 'password2', text: '비밀번호가 서로 달라요.' });
    if (nick.trim() && nickError(nick)) return setErr({ field: 'nick', text: nickError(nick) });
    const d = await post('/api/auth/email/signup', { email, password: pw, nick: nick.trim() || suggest });
    if (d) setView('sent');
  };

  const field = (id, label, props, f) => (
    <div className="login-field">
      <label className="contact-label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className={`contact-input${fieldErr(f) ? ' is-error' : ''}`} aria-invalid={!!fieldErr(f)} {...props} />
      {fieldErr(f) && <p className="field-msg">{fieldErr(f)}</p>}
    </div>
  );

  const title = {
    signup: '이메일로 회원가입',
    sent: '메일함을 확인해 주세요',
    find: '아이디 및 비밀번호 찾기',
    findSent: '메일함을 확인해 주세요',
  }[view] || '로그인';

  return createPortal(
    <div className="contact-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="login" role="dialog" aria-modal="true" aria-labelledby="login-title" tabIndex={-1} ref={panel}>
        <div className="contact-head">
          <h2 id="login-title" className="contact-title">
            {title}
          </h2>
          <button type="button" className="fortune__close" aria-label="닫기" onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {view === 'login' && (
          <>
            {reason && (
              <div className="login-reason">
                <span className="login-reason-face" aria-hidden="true">
                  <LogoSymbol size={44} />
                </span>
                <p>{reason}</p>
              </div>
            )}
            <form className="login-form" onSubmit={login} noValidate>
              {field('login-email', '이메일', { type: 'email', inputMode: 'email', autoComplete: 'email', value: email, onChange: (e) => setEmail(e.target.value), placeholder: 'you@example.com' }, 'email')}
              <PasswordInput id="login-pw" label="비밀번호" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} error={fieldErr('password')} />
              <div className="login-options">
                <label className="login-keep">
                  <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
                  <span className="login-keep-box" aria-hidden="true" />
                  자동 로그인
                </label>
                <button type="button" className="login-find" onClick={() => setView('find')}>
                  아이디 및 비밀번호 찾기
                </button>
              </div>
              {err.text && !err.field && <p className="field-msg">{err.text}</p>}
              <button type="submit" className="btn-primary" disabled={busy || !emailEnabled}>
                {busy ? '확인 중…' : '로그인'}
              </button>
              {!emailEnabled && <p className="login-off-note">이메일 로그인은 준비중이에요.</p>}
            </form>
            <p className="login-switch">
              아직 회원이 아니신가요?
              <button type="button" className="my-link" onClick={() => setView('signup')}>
                회원가입
              </button>
            </p>
            <p className="login-or">
              <span>또는 간편 로그인</span>
            </p>
            <div className="login-social">
              {enabled ? (
                <a className="kakao-circle" href={`/api/auth/kakao/login?next=${encodeURIComponent(next)}${keep ? '' : '&keep=0'}`} aria-label="카카오로 로그인·회원가입">
                  <KakaoSymbol />
                </a>
              ) : (
                <span className="kakao-circle is-off" aria-label="카카오 로그인 준비중">
                  <KakaoSymbol />
                </span>
              )}            </div>
          </>
        )}

        {view === 'signup' && (
          <form className="login-form" onSubmit={signup} noValidate>
            {field('su-email', '이메일', { type: 'email', inputMode: 'email', autoComplete: 'email', value: email, onChange: (e) => setEmail(e.target.value), onBlur: () => setEmailBlurred(true), placeholder: 'you@example.com' }, 'email')}
            <PasswordInput id="su-pw" label="비밀번호" rules value={pw} onChange={(e) => setPw(e.target.value)} error={err.field === 'password' ? err.text : ''} placeholder="비밀번호 입력" />
            <PasswordInput
              id="su-pw2"
              label="비밀번호 확인"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              error={fieldErr('password2')}
              placeholder="한 번 더 입력"
              okText={pw2 && pw === pw2 && passwordOk(pw) ? '비밀번호가 같아요.' : ''}
            />
            {field('su-nick', '닉네임', { value: nick, maxLength: 12, onChange: (e) => setNick(e.target.value), placeholder: suggest }, 'nick')}
            <p className="login-hint">비워 두면 회색 닉네임으로 가입돼요. 닉네임은 다른 회원과 겹칠 수 없어요.</p>
            {err.text && !err.field && <p className="field-msg">{err.text}</p>}
            <button type="submit" className="btn-primary" disabled={busy || !emailEnabled}>
              {busy ? '보내는 중…' : '인증 메일 받기'}
            </button>
            {!emailEnabled && <p className="login-off-note">이메일 가입은 준비중이에요. 카카오로 가입해 주세요.</p>}
            <p className="login-switch">
              이미 회원이신가요?
              <button type="button" className="my-link" onClick={() => setView('login')}>
                로그인
              </button>
            </p>
          </form>
        )}

        {view === 'sent' && (
          <div className="login-sent">
            <p>
              <b>{email.trim()}</b>로 인증 메일을 보냈어요.
            </p>
            <p>메일의 <b>이메일 인증하기</b>를 누르면 바로 가입이 끝나요. 링크는 24시간 동안 쓸 수 있어요.</p>
            <p className="login-hint">메일이 안 보이면 스팸함도 확인해 주세요.</p>
            <button type="button" className="btn-primary" onClick={onClose}>
              확인
            </button>
          </div>
        )}

        {view === 'find' && (
          <form className="login-form" onSubmit={find} noValidate>
            <p className="login-find-intro">
              아이디는 가입할 때 쓴 <b>이메일 주소</b>예요. 가입한 이메일을 넣으면 비밀번호를 새로 정할 수 있는 링크를 보내 드려요.
            </p>
            {field('find-email', '가입한 이메일', { type: 'email', inputMode: 'email', autoComplete: 'email', value: email, onChange: (e) => setEmail(e.target.value), placeholder: 'you@example.com' }, 'email')}
            {err.text && !err.field && <p className="field-msg">{err.text}</p>}
            <button type="submit" className="btn-primary" disabled={busy || !emailEnabled}>
              {busy ? '보내는 중…' : '비밀번호 재설정 메일 받기'}
            </button>
            <p className="login-hint">카카오로 가입했다면 비밀번호 없이 카카오 버튼으로 로그인할 수 있어요.</p>
            <p className="login-switch">
              <button type="button" className="my-link" onClick={() => setView('login')}>
                로그인으로 돌아가기
              </button>
            </p>
          </form>
        )}

        {view === 'findSent' && (
          <div className="login-sent">
            <p>
              <b>{email.trim()}</b>로 가입한 계정이 있으면 비밀번호 재설정 메일을 보냈어요.
            </p>
            <p>메일의 <b>비밀번호 새로 정하기</b>를 눌러 주세요. 링크는 1시간 동안 쓸 수 있어요.</p>
            <p className="login-hint">메일이 안 보이면 스팸함도 확인해 주세요.</p>
            <button type="button" className="btn-primary" onClick={onClose}>
              확인
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
