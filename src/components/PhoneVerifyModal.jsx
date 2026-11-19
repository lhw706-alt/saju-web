// 첫 결제 휴대폰 인증 창 (2026-11-19 사용자 지시: 결제하기를 누르면 처음 한 번만 뜨는 모달)
// 번호 입력 → 인증번호 받기(/api/pay/phone/send) → 6자리 확인(/api/pay/phone/verify) → onDone(가린 번호) 후 바로 결제로 이어짐
// 새 창은 포털로 body 에 (머리 메뉴가 닫기 버튼을 덮지 않게). 휴대폰에선 아래쪽 시트(.contact 스타일 재사용)
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TEL_RE = /^01[016789][0-9]{7,8}$/;
const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
    .catch(() => ({ ok: false, d: {} }));

export default function PhoneVerifyModal({ open, onClose, onDone }) {
  const [tel, setTel] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: false, text: '' });
  const codeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setCode('');
    setSent(false);
    setMsg({ ok: false, text: '' });
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const send = async () => {
    setBusy(true);
    const { ok, d } = await post('/api/pay/phone/send', { tel });
    setBusy(false);
    if (!ok) return setMsg({ ok: false, text: d.error || '문자를 보내지 못했어요.' });
    setSent(true);
    setCode('');
    setMsg({ ok: true, text: '인증번호를 보냈어요. 3분 안에 입력해 주세요.' });
    setTimeout(() => codeRef.current?.focus(), 50);
  };
  const verify = async (e) => {
    e?.preventDefault();
    setBusy(true);
    const { ok, d } = await post('/api/pay/phone/verify', { code });
    setBusy(false);
    if (!ok) return setMsg({ ok: false, text: d.error || '인증하지 못했어요.' });
    onDone(d.phone);
  };

  return createPortal(
    <div className="contact-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="contact phone-verify" role="dialog" aria-modal="true" aria-labelledby="pv-title">
        <div className="contact-head">
          <h2 id="pv-title" className="contact-title">
            휴대폰 인증
          </h2>
          <button type="button" className="fortune__close" aria-label="휴대폰 인증 창 닫기" onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <form className="contact-form" onSubmit={verify} noValidate>
          <p className="contact-lead">처음 결제할 때 한 번만 휴대폰 인증이 필요해요. 인증한 번호는 결제대행사(스마트로)의 결제 확인에 쓰이고, 다음부터는 바로 결제할 수 있어요.</p>
          <label className="contact-label" htmlFor="pv-tel">
            휴대폰 번호
          </label>
          <div className="pv-row">
            <input id="pv-tel" className="contact-input" type="tel" inputMode="numeric" autoComplete="tel" placeholder="01012345678" value={tel} autoFocus onChange={(e) => setTel(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))} />
            <button type="button" className="btn-ghost pv-btn" onClick={send} disabled={!TEL_RE.test(tel) || busy}>
              {sent ? '다시 받기' : '인증번호 받기'}
            </button>
          </div>
          {sent && (
            <>
              <label className="contact-label" htmlFor="pv-code">
                인증번호
              </label>
              <input id="pv-code" ref={codeRef} className="contact-input" inputMode="numeric" autoComplete="one-time-code" placeholder="6자리 숫자" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} />
            </>
          )}
          {msg.text && (
            <p className={`pv-msg${msg.ok ? ' is-ok' : ''}`} role="status">
              {msg.text}
            </p>
          )}
          <button type="submit" className="btn-primary pv-submit" disabled={!sent || code.length !== 6 || busy}>
            {busy && sent ? '확인 중…' : '인증하고 결제 계속하기'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
