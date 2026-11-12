// 사주 용어 설명: <Help term="천간" /> 의 ? 버튼(또는 <TermButton>)을 누르면 설명 창.
// GlossaryProvider 가 창 하나를 관리하고, 창 안에서 관련 용어로 이어서 볼 수 있음.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GLOSSARY, GOD_GROUPS } from '../lib/glossary.js';

const Ctx = createContext(() => {});
export const useGlossary = () => useContext(Ctx);

function Modal({ term, onOpen, onClose }) {
  const item = GLOSSARY[term];
  const panel = useRef(null);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  useEffect(() => {
    panel.current?.focus();
    panel.current?.scrollTo?.(0, 0);
  }, [term]);
  if (!item) return null;

  return createPortal(
    <div className="contact-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="gloss" role="dialog" aria-modal="true" aria-labelledby="gloss-title" tabIndex={-1} ref={panel}>
        <div className="contact-head">
          <h2 id="gloss-title" className="gloss-title">
            {item.title}
          </h2>
          <button type="button" className="fortune__close" aria-label="설명 닫기" onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="gloss-body">
          {item.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {item.groups && (
          <div className="gloss-groups">
            {GOD_GROUPS.map((g) => (
              <div key={g.label} className="gloss-group">
                <span>{g.label}</span>
                <div>
                  {g.gods.map((god) => (
                    <button key={god} type="button" className="gloss-chip" onClick={() => onOpen(god)}>
                      {god}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {item.related?.length > 0 && !item.groups && (
          <div className="gloss-related">
            <span>함께 보면 좋은 말</span>
            <div>
              {item.related.map((r) => (
                <button key={r} type="button" className="gloss-chip" onClick={() => onOpen(r)}>
                  {GLOSSARY[r]?.title.split(' ')[0] ?? r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function GlossaryProvider({ children }) {
  const [term, setTerm] = useState(null);
  const close = useCallback(() => setTerm(null), []);
  return (
    <Ctx.Provider value={setTerm}>
      {children}
      {term && <Modal term={term} onOpen={setTerm} onClose={close} />}
    </Ctx.Provider>
  );
}

// 작은 ? 버튼
export function Help({ term, label }) {
  const open = useGlossary();
  if (!GLOSSARY[term]) return null;
  return (
    <button type="button" className="help" aria-label={`${label || term} 뜻 보기`} onClick={() => open(term)}>
      ?
    </button>
  );
}

// 용어 자체를 누를 수 있는 칩 (십성 이름 등)
export function TermButton({ term, children, className = '' }) {
  const open = useGlossary();
  if (!GLOSSARY[term]) return <span className={className}>{children || term}</span>;
  return (
    <button type="button" className={`term ${className}`} onClick={() => open(term)} aria-label={`${term} 뜻 보기`}>
      {children || term}
    </button>
  );
}
