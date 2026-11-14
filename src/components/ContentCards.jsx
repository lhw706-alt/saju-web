// 메인 콘텐츠 카드 (분류별, 2열). 카드마다 그 콘텐츠에 맞는 소품을 든 천둥도사(천동이) 그림.
// 쓸 수 있는 것은 풀이로 연결, 나머지는 눌렀을 때 '준비중' 알림.
import { useEffect, useRef, useState } from 'react';
import { GROUPS, CONTENTS, SOON_MESSAGE } from '../lib/contents.js';
import { dosaArtSvg } from '../brand/dosaArt.js';
import { PRICE_TAGS } from '../lib/wallet.js';

// 카드 그림은 한 번만 만들어 둠
const ART = Object.fromEntries(CONTENTS.map((c) => [c.id, dosaArtSvg(c.id)]));

export default function ContentCards({ onOpen }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const click = (c) => {
    if (c.status === 'live') return onOpen(c);
    clearTimeout(timer.current);
    setToast({ key: Date.now(), text: `${c.title} — ${SOON_MESSAGE[c.status]}` });
    timer.current = setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="contents">
      {GROUPS.map((g) => (
        <section key={g.id} id={g.id} className="content-group">
          <h2 className="section-title">{g.label}</h2>
          <ul className="content-grid">
            {CONTENTS.filter((c) => c.group === g.id)
              .sort((a, b) => (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1)) // 쓸 수 있는 콘텐츠를 준비중보다 앞에 (2026-11-14 사용자 지시, 같은 상태끼리는 contents.js 순서)
              .map((c) => (
              <li key={c.id}>
                <button type="button" className={`content-card el-${c.el}${c.status === 'live' ? '' : ' is-soon'}`} onClick={() => click(c)}>
                  <span className="content-text">
                    <span className={`content-badge${c.status === 'live' ? (PRICE_TAGS[c.id] ? ' is-paid' : ' is-live') : ''}`}>{c.status === 'live' ? PRICE_TAGS[c.id] || '무료' : '준비중'}</span>
                    <strong>{c.title}</strong>
                    <span>{c.desc}</span>
                  </span>
                  <span className="content-dosa" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ART[c.id] }} />
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
