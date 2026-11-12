import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { SITE } from '../site.js';
import { trackEvent } from '../lib/analytics.js';

// 운영자 문의 폼 (푸터 '문의하기') — 다모아픽 ContactModal 과 같은 방식.
// - 전송: Netlify Forms (index.html 의 숨은 form name="contact" 로 필드 등록). 접수되면 Netlify 가 알림 메일 발송
//   → 받는 주소는 Netlify 관리 화면 Forms > Form notifications 에서 설정 (다모아픽과 같은 주소, 코드에 메일 주소를 두지 않음)
// - 받는 정보: 문의 유형, 회사·브랜드명(제휴만, 선택), 답변 받을 이메일, 내용, 문의한 페이지 주소. 이름·전화번호·생년월일은 받지 않음
// - 스팸: honeypot 필드(bot-field)
const TYPES = [
  { key: 'site', label: '이용 문의' },
  { key: 'error', label: '풀이·계산 오류 신고' },
  { key: 'ad', label: '제휴·광고 제안', company: true },
  { key: 'etc', label: '기타' },
];
const MAX = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactModal({ open, onClose }) {
  const { pathname, search } = useLocation();
  const [type, setType] = useState('site');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [agree, setAgree] = useState(false);
  const [bot, setBot] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [touched, setTouched] = useState(false);
  const panel = useRef(null);
  const first = useRef(null);
  const t = TYPES.find((x) => x.key === type);

  // 열릴 때: 첫 항목에 포커스, 배경 스크롤 막기, Esc 로 닫기, Tab 이 창 밖으로 나가지 않게
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => first.current?.focus(), 0);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      const f = panel.current.querySelectorAll('button:not([disabled]), input:not([type="hidden"]):not([tabindex="-1"]), textarea, a[href]');
      if (!f.length) return;
      const [a, z] = [f[0], f[f.length - 1]];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  // 닫았다 다시 열면 완료 화면 대신 새 폼
  useEffect(() => {
    if (open && status === 'done') {
      setStatus('idle');
      setCompany('');
      setMessage('');
      setAgree(false);
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const emailOk = EMAIL_RE.test(email.trim());
  const msgOk = message.trim().length >= 10;
  const valid = emailOk && msgOk && agree;

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || status === 'sending') return;
    setStatus('sending');
    const body = new URLSearchParams({
      'form-name': 'contact',
      'bot-field': bot,
      type: t.label,
      company: t.company ? company.trim() : '',
      email: email.trim(),
      message: message.trim(),
      page: `${SITE.url}${pathname}${search}`,
      consent: '동의',
    });
    try {
      const r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
      if (!r.ok) throw new Error(String(r.status));
      setStatus('done');
      trackEvent('contact_submit', { contact_type: type });
    } catch {
      setStatus('error');
    }
  };

  return createPortal(
    <div className="contact-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="contact" role="dialog" aria-modal="true" aria-labelledby="contact-title" ref={panel}>
        <div className="contact-head">
          <h2 id="contact-title" className="contact-title">
            문의하기
          </h2>
          <button type="button" className="fortune__close" aria-label="문의 창 닫기" onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {status === 'done' ? (
          <div className="contact-done" role="status">
            <strong>문의가 접수됐어요</strong>
            <p>
              적어 주신 이메일({email.trim()})로 답변드릴게요.
              <br />
              보통 영업일 기준 2~3일 안에 답변해요.
            </p>
            <button type="button" className="btn-primary" onClick={onClose}>
              확인
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={submit} noValidate>
            <p className="contact-lead">사이트 이용 중 궁금한 점이나 잘못된 풀이·계산, 제휴 제안을 남겨 주세요.</p>

            {/* 봇만 채우는 숨은 칸 */}
            <label className="visually-hidden" aria-hidden="true">
              비워 두세요
              <input name="bot-field" tabIndex={-1} autoComplete="off" value={bot} onChange={(e) => setBot(e.target.value)} />
            </label>

            <fieldset className="contact-field">
              <legend className="contact-label">문의 유형</legend>
              <div className="contact-types" role="radiogroup">
                {TYPES.map((x, i) => (
                  <label key={x.key} className={`contact-type${type === x.key ? ' on' : ''}`}>
                    <input
                      ref={i === 0 ? first : undefined}
                      type="radio"
                      name="type"
                      value={x.key}
                      checked={type === x.key}
                      onChange={() => setType(x.key)}
                      className="visually-hidden"
                    />
                    {x.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {t.company && (
              <div className="contact-field">
                <label className="contact-label" htmlFor="contact-company">
                  회사·브랜드명 <span className="contact-opt">선택</span>
                </label>
                <input id="contact-company" className="contact-input" value={company} maxLength={60} onChange={(e) => setCompany(e.target.value)} />
              </div>
            )}

            <div className="contact-field">
              <label className="contact-label" htmlFor="contact-email">
                답변 받을 이메일
              </label>
              <input
                id="contact-email"
                className={`contact-input${touched && !emailOk ? ' is-error' : ''}`}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                maxLength={100}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-invalid={touched && !emailOk}
                aria-describedby={touched && !emailOk ? 'contact-email-err' : undefined}
              />
              {touched && !emailOk && (
                <span id="contact-email-err" className="contact-err">
                  이메일 주소를 확인해 주세요.
                </span>
              )}
            </div>

            <div className="contact-field">
              <label className="contact-label" htmlFor="contact-message">
                문의 내용
              </label>
              <textarea
                id="contact-message"
                className={`contact-input contact-textarea${touched && !msgOk ? ' is-error' : ''}`}
                value={message}
                maxLength={MAX}
                rows={6}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={type === 'error' ? '어느 화면에서 무엇이 잘못됐는지 적어 주세요.' : type === 'ad' ? '제안 내용을 적어 주세요.' : '궁금한 점을 적어 주세요.'}
                aria-invalid={touched && !msgOk}
                aria-describedby="contact-message-help"
              />
              <span id="contact-message-help" className={`contact-help${touched && !msgOk ? ' is-error' : ''}`}>
                {touched && !msgOk ? '10자 이상 적어 주세요.' : '생년월일·전화번호 같은 개인정보는 적지 말아 주세요.'}
                <span className="contact-count">
                  {message.length}/{MAX}
                </span>
              </span>
            </div>

            <label className={`contact-agree${touched && !agree ? ' is-error' : ''}`}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>
                <strong>개인정보 수집·이용에 동의해요 (필수)</strong>
                수집 항목: 이메일, 문의 내용 · 목적: 문의 확인과 답변 · 보유 기간: 답변 완료 후 1년 뒤 삭제.{' '}
                <Link to="/privacy" onClick={onClose}>
                  개인정보 처리방침
                </Link>
              </span>
            </label>

            {status === 'error' && (
              <p className="contact-err contact-err-box" role="alert">
                전송하지 못했어요. 잠시 후 다시 시도해 주세요.
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={status === 'sending'}>
              {status === 'sending' ? '보내는 중…' : '문의 보내기'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
