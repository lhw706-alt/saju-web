// 메인 콘텐츠 카드 (분류별). 쓸 수 있는 것은 풀이로 연결, 나머지는 눌렀을 때 '준비중' 알림.
import { useEffect, useRef, useState } from 'react';
import { GROUPS, CONTENTS, SOON_MESSAGE } from '../lib/contents.js';

export default function ContentCards({ onOpen }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const click = (c) => {
    if (c.status === 'live') return onOpen(c);
    clearTimeout(timer.current);
    setToast({ key: Date.now(), text: `${c.title} — ${SOON_MESSAGE[c.status]}` });
    timer.current = setTimeout(() => setToast(null), 2400);
  };

  return (
    <div className="contents">
      {GROUPS.map((g) => (
        <section key={g.id} id={g.id} className="content-group">
          <h2 className="section-title">{g.label}</h2>
          <ul className="content-grid">
            {CONTENTS.filter((c) => c.group === g.id).map((c) => (
              <li key={c.id}>
                <button type="button" className={`content-card${c.status === 'live' ? '' : ' is-soon'}`} onClick={() => click(c)}>
                  <span className={`content-glyph el-${c.el}`} aria-hidden="true">
                    {c.glyph}
                  </span>
                  <span className="content-text">
                    <strong>{c.title}</strong>
                    <span>{c.desc}</span>
                  </span>
                  <span className={`content-badge${c.status === 'live' ? ' is-live' : ''}`}>{c.status === 'live' ? '무료' : '준비중'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="toast-wrap" role="status" aria-live="polite">
        {toast && (
          <p key={toast.key} className="toast">
            {toast.text}
          </p>
        )}
      </div>
    </div>
  );
}
