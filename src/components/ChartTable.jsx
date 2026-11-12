import { ELEMENT_KO } from '../lib/saju.js';

// 전통 표기 순서: 오른쪽부터 년·월·일·시 → 화면에서는 왼쪽부터 시·일·월·년
const COLS = [
  ['hour', '시주'],
  ['day', '일주'],
  ['month', '월주'],
  ['year', '년주'],
];

function Glyph({ char, ko, element, yang }) {
  return (
    <div className={`glyph el-${element}`}>
      <span className="glyph-char">{char}</span>
      <span className="glyph-sub">
        {ko} · {yang ? '+' : '−'}{ELEMENT_KO[element]}
      </span>
    </div>
  );
}

export default function ChartTable({ chart }) {
  return (
    <div className="chart" role="table" aria-label="사주 원국">
      <div className="chart-row chart-head" role="row">
        <span className="chart-label" />
        {COLS.map(([k, label]) => (
          <span key={k} role="columnheader" className={k === 'day' ? 'is-day' : ''}>{label}</span>
        ))}
      </div>

      <div className="chart-row" role="row">
        <span className="chart-label">십성</span>
        {COLS.map(([k]) => (
          <span key={k} className="god">{chart.pillars[k]?.stemGod ?? ''}</span>
        ))}
      </div>
      <div className="chart-row" role="row">
        <span className="chart-label">천간</span>
        {COLS.map(([k]) => {
          const p = chart.pillars[k];
          return p ? <Glyph key={k} char={p.stem} ko={p.stemKo} element={p.stemElement} yang={p.stemYang} /> : <div key={k} className="glyph glyph-empty">?</div>;
        })}
      </div>
      <div className="chart-row" role="row">
        <span className="chart-label">지지</span>
        {COLS.map(([k]) => {
          const p = chart.pillars[k];
          return p ? <Glyph key={k} char={p.branch} ko={p.branchKo} element={p.branchElement} yang={p.branchYang} /> : <div key={k} className="glyph glyph-empty">?</div>;
        })}
      </div>
      <div className="chart-row" role="row">
        <span className="chart-label">십성</span>
        {COLS.map(([k]) => (
          <span key={k} className="god">{chart.pillars[k]?.branchGod ?? ''}</span>
        ))}
      </div>
      <div className="chart-row small" role="row">
        <span className="chart-label">지장간</span>
        {COLS.map(([k]) => (
          <span key={k}>{chart.pillars[k]?.hidden.map((h) => h.stemKo).join(' ') ?? ''}</span>
        ))}
      </div>
      <div className="chart-row small" role="row">
        <span className="chart-label">12운성</span>
        {COLS.map(([k]) => (
          <span key={k}>{chart.pillars[k]?.stage ?? ''}</span>
        ))}
      </div>
    </div>
  );
}
