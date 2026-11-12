// 사이트 디자인에 맞춘 드롭다운 (브라우저 기본 목록은 모양을 바꿀 수 없어서 직접 만듦).
// ARIA listbox 패턴: 버튼(aria-haspopup) → 목록(role=listbox, aria-activedescendant).
// 키보드: ↑↓ Home End 로 이동, Enter·Space 로 고르기, Esc·Tab 으로 닫기.
import { useEffect, useId, useRef, useState } from 'react';

export default function Select({ value, onChange, options, placeholder = '선택', ariaLabel }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const selIndex = options.findIndex((o) => String(o.value) === String(value));
  const current = selIndex >= 0 ? options[selIndex] : null;

  // 열면: 고른 항목에 커서, 목록에 포커스, 바깥을 누르면 닫기
  useEffect(() => {
    if (!open) return undefined;
    setActive(selIndex >= 0 ? selIndex : 0);
    setTimeout(() => listRef.current?.focus(), 0);
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 커서가 움직이면 보이도록 스크롤
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (i) => {
    onChange(options[i].value);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onKey = (e) => {
    const last = options.length - 1;
    if (e.key === 'ArrowDown') setActive((a) => Math.min(last, a + 1));
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(last);
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Escape') {
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === 'Tab') setOpen(false);
    else return;
    e.preventDefault();
  };

  return (
    <div className={`sel${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        ref={btnRef}
        className={`sel-trigger${current ? '' : ' is-empty'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={ariaLabel ? `${ariaLabel}: ${current ? current.label : placeholder}` : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{current ? current.label : placeholder}</span>
        <svg className="sel-chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          id={`${id}-list`}
          ref={listRef}
          className="sel-list"
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={onKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              data-i={i}
              role="option"
              aria-selected={i === selIndex}
              className={`sel-option${i === active ? ' is-active' : ''}${i === selIndex ? ' is-selected' : ''}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              {o.label}
              {i === selIndex && (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
