// 로그인 창: 이메일·비밀번호 로그인 + 카카오 간편 로그인(노란 동그라미) / 이메일 회원가입 / 인증 메일 보냄
// 서버: netlify/functions/auth.mjs. 카카오 버튼은 카카오 디자인 가이드 색(#FEE500)과 말풍선 심볼
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function KakaoSymbol({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#000" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.66 6.77l-.95 3.48c-.08.3.26.54.52.37l4.13-2.74c.54.08 1.08.12 1.64.12 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
    </svg>
  );
}

export default function LoginModal({ open, enabled, emailEnabled, onClose, onLoggedIn }) {
  const { pathname, search } = useLocation();
  const panel = useRef(null);
  const [view, setView] = useState('login'); // login | signup | sent
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [nick, setNick] = useState('');
  const [suggest, setSuggest] = useState('천둥의 별빛 7');
  const [err, setErr] = useState({ field: '', text: '' });
  const [busy, setBusy] = useState(false);

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
  const fieldErr = (f) => (err.field === f ? err.text : '');

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
    const d = await post('/api/auth/email/login', { email, password: pw });
    if (d) onLoggedIn(d.nick);
  };

  const signup = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setErr({ field: 'email', text: '이메일 주소를 확인해 주세요.' });
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return setErr({ field: 'password', text: '비밀번호는 영문과 숫자를 섞어 8자 이상으로 정해 주세요.' });
    if (pw !== pw2) return setErr({ field: 'password2', text: '비밀번호가 서로 달라요.' });
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

  const title = view === 'signup' ? '이메일로 회원가입' : view === 'sent' ? '메일함을 확인해 주세요' : '로그인';

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
            <form className="login-form" onSubmit={login} noValidate>
              {field('login-email', '이메일', { type: 'email', inputMode: 'email', autoComplete: 'email', value: email, onChange: (e) => setEmail(e.target.value), placeholder: 'you@example.com' }, 'email')}
              {field('login-pw', '비밀번호', { type: 'password', autoComplete: 'current-password', value: pw, onChange: (e) => setPw(e.target.value) }, 'password')}
              {err.text && !err.field && <p className="field-msg">{err.text}</p>}
              <button type="submit" className="btn-primary" disabled={busy || !emailEnabled}>
                {busy ? '확인 중…' : '로그인'}
              </button>
              {!emailEnabled && <p className="login-off-note">이메일 로그인은 준비중이에요.</p>}
            </form>
            <p className="login-switch">
              처음 오셨어요?
              <button type="button" className="my-link" onClick={() => setView('signup')}>
                이메일로 회원가입
              </button>
            </p>
            <p className="login-or">
              <span>또는 간편 로그인</span>
            </p>
            <div className="login-social">
              {enabled ? (
                <a className="kakao-circle" href={`/api/auth/kakao/login?next=${encodeURIComponent(next)}`} aria-label="카카오로 로그인·회원가입">
                  <KakaoSymbol />
                </a>
              ) : (
                <span className="kakao-circle is-off" aria-label="카카오 로그인 준비중">
                  <KakaoSymbol />
                </span>
              )}
              <span className="login-social-label">카카오</span>
            </div>
          </>
        )}

        {view === 'signup' && (
          <form className="login-form" onSubmit={signup} noValidate>
            {field('su-email', '이메일', { type: 'email', inputMode: 'email', autoComplete: 'email', value: email, onChange: (e) => setEmail(e.target.value), placeholder: 'you@example.com' }, 'email')}
            {field('su-pw', '비밀번호', { type: 'password', autoComplete: 'new-password', value: pw, onChange: (e) => setPw(e.target.value), placeholder: '영문+숫자 8자 이상' }, 'password')}
            {field('su-pw2', '비밀번호 확인', { type: 'password', autoComplete: 'new-password', value: pw2, onChange: (e) => setPw2(e.target.value) }, 'password2')}
            {field('su-nick', '닉네임', { value: nick, maxLength: 12, onChange: (e) => setNick(e.target.value), placeholder: suggest }, 'nick')}
            <p className="login-hint">비워 두면 회색 닉네임으로 가입돼요. 닉네임은 다른 회원과 겹칠 수 없어요.</p>
            {err.text && !err.field && <p className="field-msg">{err.text}</p>}
            <button type="submit" className="btn-primary" disabled={busy || !emailEnabled}>
              {busy ? '보내는 중…' : '인증 메일 받기'}
            </button>
            {!emailEnabled && <p className="login-off-note">이메일 가입은 준비중이에요. 카카오로 가입해 주세요.</p>}
            <p className="login-switch">
              이미 가입하셨어요?
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

        {view === 'signup' && (
          <p className="login-note">
            가입하면{' '}
            <Link to="/privacy" onClick={onClose}>
              개인정보 처리방침
            </Link>
            에 동의한 것으로 봐요. 이메일은 가입·로그인에만 써요.
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
