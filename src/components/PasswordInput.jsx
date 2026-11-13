// 비밀번호 입력칸: 보기 버튼(눈) + (rules 일 때) 입력하는 동안 규칙 확인 목록과 안전도 막대
// 규칙은 src/lib/password.js (서버도 같은 규칙으로 다시 확인)
import { useState } from 'react';
import { passwordChecks } from '../lib/password.js';

function Eye({ off }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

export default function PasswordInput({ id, label, value, onChange, error, rules = false, placeholder, autoComplete = 'new-password', okText }) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  const checks = passwordChecks(value);
  const passed = checks.filter((c) => c.ok).length;
  const typed = value.length > 0;
  const bad = !!error || (rules && typed && passed < checks.length);
  const showRules = rules && (focus || typed);

  return (
    <div className="login-field">
      <label className="contact-label" htmlFor={id}>
        {label}
      </label>
      <div className="pw-wrap">
        <input
          id={id}
          className={`contact-input pw-input${bad ? ' is-error' : ''}`}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          maxLength={64}
          aria-invalid={bad}
          aria-describedby={showRules ? `${id}-rules` : undefined}
          onChange={onChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
        />
        <button type="button" className="pw-eye" aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'} onClick={() => setShow((s) => !s)}>
          <Eye off={show} />
        </button>
      </div>
      {showRules && (
        <div className="pw-rules" id={`${id}-rules`}>
          <div className={`pw-meter is-${passed}`} aria-hidden="true">
            <span />
          </div>
          <ul>
            {checks.map((c) => (
              <li key={c.id} className={c.ok ? 'is-ok' : typed ? 'is-bad' : ''}>
                <span aria-hidden="true">{c.ok ? '✓' : '✕'}</span>
                {c.label}
                <span className="visually-hidden">{c.ok ? ' (충족)' : ' (미충족)'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="field-msg">{error}</p>}
      {!error && okText && <p className="field-ok">{okText}</p>}
    </div>
  );
}
