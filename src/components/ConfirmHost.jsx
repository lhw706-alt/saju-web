// 사이트 디자인의 확인 창 (2026-11-15 사용자 지시: 브라우저 기본 confirm/alert 대신).
// 어디서든 await askConfirm({ title, message, ok, cancel }) → true/false, await showAlert({ title, message }).
// Layout 에 <ConfirmHost /> 하나만 둠. 휴대폰에선 다른 모달처럼 아래쪽 시트.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

let push = null;
export function askConfirm(opts) {
  const o = typeof opts === 'string' ? { message: opts } : opts;
  if (!push) return Promise.resolve(window.confirm(o.message)); // 혹시 Host 가 없으면 기본 창
  return new Promise((resolve) => push({ ...o, resolve }));
}
export function showAlert(opts) {
  const o = typeof opts === 'string' ? { message: opts } : opts;
  return askConfirm({ ...o, alert: true });
}

export default function ConfirmHost() {
  const [cur, setCur] = useState(null);
  const okRef = useRef(null);
  useEffect(() => {
    push = (o) => setCur(o);
    return () => {
      push = null;
    };
  }, []);
  const close = (v) => {
    cur?.resolve(v);
    setCur(null);
  };
  useEffect(() => {
    if (!cur) return;
    okRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur]);
  if (!cur) return null;
  return createPortal(
    <div className="contact-overlay confirm-overlay" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
      <div className="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg">
        {cur.title && (
          <h2 id="confirm-title" className="confirm-title">
            {cur.title}
          </h2>
        )}
        <p id="confirm-msg" className="confirm-msg">
          {cur.message}
        </p>
        {cur.note && <p className="confirm-note">{cur.note}</p>}
        <div className="confirm-actions">
          {!cur.alert && (
            <button type="button" className="confirm-cancel" onClick={() => close(false)}>
              {cur.cancel || '취소'}
            </button>
          )}
          <button type="button" className="confirm-ok" ref={okRef} onClick={() => close(true)}>
            {cur.ok || '확인'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
