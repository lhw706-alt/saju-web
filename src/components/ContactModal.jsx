import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { SITE } from '../site.js';
import { trackEvent } from '../lib/analytics.js';

// 운영자 문의 폼 (푸터 '문의하기', 마이페이지 내 문의내역) — 로그인 회원만 (2026-11-13). 비로그인이면 Layout 이 로그인 창부터 띄움.
// - 저장: /api/inquiry → 계정에 저장(마이페이지 내 문의내역, 관리자 /admin 에서 답변)
// - 알림: Netlify Forms 에도 같이 보냄 (index.html 의 숨은 form name="contact" 로 필드 등록). 접수되면 Netlify 가 알림 메일 발송
//   → 받는 주소는 Netlify 관리 화면 Forms > Form notifications 에서 설정 (다모아픽과 같은 주소, 코드에 메일 주소를 두지 않음)
// - 받는 정보: 문의 유형, 회사·브랜드명(제휴만, 선택), 내용, 문의한 페이지 주소(+ 회원번호·닉네임). 이메일은 받지 않음(답변은 마이페이지). 이름·전화번호·생년월일은 받지 않음
// - 스팸: honeypot 필드(bot-field)
const TYPES = [
  { key: 'site', label: '이용 문의' },
  { key: 'error', label: '풀이·계산 오류 신고' },
  { key: 'ad', label: '제휴·광고 제안', company: true },
  { key: 'etc', label: '기타' },
];
const MAX = 2000;

export default function ContactModal({ open, onClose, onSent, onNeedLogin }) {
  const { pathname, search } = useLocation();
  const [errText, setErrText] = useState('');
  const [type, setType] = useState('site');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
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
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const msgOk = message.trim().length >= 10;
  const valid = msgOk;

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || status === 'sending') return;
    setStatus('sending');
    setErrText('');
    if (bot) return setStatus('done'); // 봇이면 저장하지 않고 끝난 척
    const page = `${SITE.url}${pathname}${search}`;
    // 1) 계정에 저장 (마이페이지 내 문의내역)
    const r = await fetch('/api/inquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, company: t.company ? company.trim() : '', message: message.trim(), page }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) {
      if (d?.login) return onNeedLogin?.();
      setErrText(d?.error || '');
      return setStatus('error');
    }
    // 2) 운영자 알림 메일용으로 Netlify Forms 에도 보냄 (실패해도 문의는 이미 저장됨)
    const body = new URLSearchParams({
      'form-name': 'contact',
      'bot-field': '',
      type: t.label,
      company: t.company ? company.trim() : '',
      message: message.trim(),
      page,
      consent: '처리방침 고지(동의 불필요)',
      inquiry: d.id,
    });
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() }).catch(() => {});
    setStatus('done');
    trackEvent('contact_submit', { contact_type: type });
    onSent?.();
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
              답변은 마이페이지의 내 문의내역에서 볼 수 있어요.
              <br />
              보통 영업일 기준 2~3일 안에 답변드려요.
            </p>
            <div className="contact-done-btns">
              <button type="button" className="btn-primary" onClick={onClose}>
                확인
              </button>
              {!pathname.startsWith('/my/support') && (
                <Link to="/my/support" className="btn-ghost" onClick={onClose}>
                  내 문의내역 보기
                </Link>
              )}
            </div>
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

            {/* 회원 요청 처리에 필요한 정보라 별도 동의 없이 받고 처리방침에 공개 (개인정보 보호법 제15조 1항 4호) */}
            <p className="contact-notice">
              문의 내용은 답변을 위해 회원 정보와 함께 보관하고, 답변 후 1년이 지나거나 탈퇴하면 지워져요.{' '}
              <Link to="/privacy" onClick={onClose}>
                개인정보 처리방침
              </Link>
            </p>

            {status === 'error' && (
              <p className="contact-err contact-err-box" role="alert">
                {errText || '전송하지 못했어요. 잠시 후 다시 시도해 주세요.'}
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
