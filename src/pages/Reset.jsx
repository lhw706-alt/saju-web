// 비밀번호 새로 정하기 (/reset?token=…) — 비밀번호 찾기 메일의 링크로 들어옴. 서버: /api/auth/email/reset
// 토큰은 읽자마자 주소창에서 지움(방문 기록·통계에 남지 않게). 저장 성공하면 로그인된 채로 메인으로.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Reset() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState({ field: '', text: '' });
  const [expired, setExpired] = useState(!/^[a-f0-9]{64}$/.test(token));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, '', '/reset');
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return setErr({ field: 'password', text: '비밀번호는 영문과 숫자를 섞어 8자 이상으로 정해 주세요.' });
    if (pw !== pw2) return setErr({ field: 'password2', text: '비밀번호가 서로 달라요.' });
    setBusy(true);
    setErr({ field: '', text: '' });
    const r = await fetch('/api/auth/email/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password: pw }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (r?.ok) {
      window.location.replace('/?login=reset');
      return;
    }
    if (d?.expired) setExpired(true);
    setErr({ field: d?.field || '', text: d?.error || '잠시 뒤 다시 시도해 주세요.' });
  };

  const msg = (f) => (err.field === f ? err.text : '');

  return (
    <section className="admin">
      <h1 className="start-title">비밀번호 새로 정하기</h1>
      {expired ? (
        <div className="admin-login card">
          <p className="login-hint">링크가 만료됐거나 이미 쓴 링크예요. 로그인 창의 '아이디 및 비밀번호 찾기'에서 메일을 다시 받아 주세요.</p>
          <Link to="/" className="btn-primary">
            메인으로
          </Link>
        </div>
      ) : (
        <form className="admin-login card" onSubmit={submit} noValidate>
          <label className="contact-label" htmlFor="reset-pw">
            새 비밀번호
          </label>
          <input id="reset-pw" className={`contact-input${msg('password') ? ' is-error' : ''}`} type="password" autoComplete="new-password" placeholder="영문+숫자 8자 이상" value={pw} onChange={(e) => setPw(e.target.value)} />
          {msg('password') && <p className="field-msg">{msg('password')}</p>}
          <label className="contact-label" htmlFor="reset-pw2">
            새 비밀번호 확인
          </label>
          <input id="reset-pw2" className={`contact-input${msg('password2') ? ' is-error' : ''}`} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          {msg('password2') && <p className="field-msg">{msg('password2')}</p>}
          {err.text && !err.field && <p className="field-msg">{err.text}</p>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? '저장 중…' : '저장하고 로그인'}
          </button>
        </form>
      )}
    </section>
  );
}
