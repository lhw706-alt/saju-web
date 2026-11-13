// 비밀번호 새로 정하기 (/reset?token=…) — 비밀번호 찾기 메일의 링크로 들어옴. 서버: /api/auth/email/reset
// 토큰은 읽자마자 주소창에서 지움(방문 기록·통계에 남지 않게). 저장 성공하면 로그인된 채로 메인으로.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput.jsx';
import { passwordOk } from '../lib/password.js';

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
    if (!passwordOk(pw)) return setErr({ field: 'password', text: '비밀번호 조건을 모두 맞춰 주세요.' });
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
          <PasswordInput id="reset-pw" label="새 비밀번호" rules value={pw} onChange={(e) => setPw(e.target.value)} error={msg('password')} placeholder="비밀번호 입력" />
          <PasswordInput
            id="reset-pw2"
            label="새 비밀번호 확인"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            error={msg('password2') || (pw2 && pw !== pw2 ? '비밀번호가 서로 달라요.' : '')}
            placeholder="한 번 더 입력"
            okText={pw2 && pw === pw2 && passwordOk(pw) ? '비밀번호가 같아요.' : ''}
          />
          {err.text && !err.field && <p className="field-msg">{err.text}</p>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? '저장 중…' : '저장하고 로그인'}
          </button>
        </form>
      )}
    </section>
  );
}
