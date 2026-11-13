// 부적 도감 (/charms) — 2026-11-13
// 오늘의 운세에서 펼친 부적을 모으는 화면. 모은 부적은 이 브라우저(localStorage)에만 저장(src/lib/fortunes.js).
// 못 모은 부적은 오행 글자만 보이는 잠긴 카드. 모은 카드를 누르면 운세 글과 처음 받은 날을 보여 줌.
import { useState } from 'react';
import { FORTUNES, LUCKY, EL_HANJA, loadBook, streak } from '../lib/fortunes.js';

const fmt = (d) => (d ? d.replace(/^(\d+)-0?(\d+)-0?(\d+)$/, '$1.$2.$3') : '');

export default function CharmBook() {
  const [book] = useState(loadBook);
  const [days] = useState(streak);
  const [open, setOpen] = useState(null);
  const got = Object.keys(book).length;
  const sel = open != null ? FORTUNES[open] : null;

  return (
    <section className="book">
      <h1 className="start-title">부적 도감</h1>
      <p className="start-lead">오늘의 운세에서 펼친 부적이 여기에 모여요. 하루 한 장, 천둥도사의 부적을 모두 모아 보세요.</p>

      <div className="book-stats card">
        <div>
          <span>모은 부적</span>
          <b>
            {got}
            <small> / {FORTUNES.length}</small>
          </b>
        </div>
        <div>
          <span>연속으로 펼친 날</span>
          <b>
            {days}
            <small>일</small>
          </b>
        </div>
        <div className="book-bar" role="progressbar" aria-valuemin={0} aria-valuemax={FORTUNES.length} aria-valuenow={got} aria-label="도감 채운 정도">
          <span style={{ width: `${(got / FORTUNES.length) * 100}%` }} />
        </div>
      </div>

      <ul className="book-grid">
        {FORTUNES.map((f, i) => {
          const rec = book[i];
          return (
            <li key={f.title}>
              {rec ? (
                <button type="button" className={`charm el-${f.el}${open === i ? ' on' : ''}`} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                  <span className="charm-seal" aria-hidden="true">
                    {EL_HANJA[f.el]}
                  </span>
                  <b>{f.title}</b>
                  {rec.count > 1 && <span className="charm-count">×{rec.count}</span>}
                </button>
              ) : (
                <div className={`charm is-locked el-${f.el}`} aria-label="아직 모으지 않은 부적">
                  <span className="charm-seal" aria-hidden="true">
                    {EL_HANJA[f.el]}
                  </span>
                  <b>?</b>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {sel && (
        <div className="book-detail card" role="status">
          <span className="fortune__kicker">
            {EL_HANJA[sel.el]} · 처음 받은 날 {fmt(book[open].first)}
          </span>
          <strong>{sel.title}</strong>
          <p>{sel.text}</p>
          <p className="book-tip">{sel.tip}</p>
          <p className="book-lucky">
            행운의 색 <i style={{ background: LUCKY[sel.el].hex }} aria-hidden="true" /> {LUCKY[sel.el].name} · 행운의 방향 {LUCKY[sel.el].dir}
          </p>
        </div>
      )}

      <p className="hint center">오른쪽 아래 부적을 눌러 오늘의 부적을 펼쳐 보세요. 모은 기록은 이 브라우저에만 남아요.</p>
    </section>
  );
}
