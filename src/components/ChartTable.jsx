import { ELEMENT_KO } from '../lib/saju.js';
import { Help, TermButton } from './Glossary.jsx';

// 전통 표기 순서: 오른쪽부터 년·월·일·시 → 화면에서는 왼쪽부터 시·일·월·년
// 처음 보는 사람도 읽을 수 있게 '태어난 날' 같은 쉬운 말을 먼저, 용어(일주 등)는 작게 + ? 설명
const COLS = [
  ['hour', '태어난 시', '시주'],
  ['day', '태어난 날', '일주'],
  ['month', '태어난 달', '월주'],
  ['year', '태어난 해', '년주'],
];
const PLAIN = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };

function Glyph({ char, ko, element, yang }) {
  return (
    <div className={`glyph el-${element}`}>
      <span className="glyph-char">{char}</span>
      <span className="glyph-ko">{ko}</span>
      <span className="glyph-sub">
        {PLAIN[element]}({ELEMENT_KO[element]}) · {yang ? '양' : '음'}
      </span>
    </div>
  );
}

function RowLabel({ term, main, sub }) {
  return (
    <span className="chart-label">
      <span className="chart-label-main">
        {main}
        <Help term={term} />
      </span>
      {sub && <span className="chart-label-sub">{sub}</span>}
    </span>
  );
}

export default function ChartTable({ chart }) {
  return (
    <div className="chart" role="table" aria-label="사주 원국">
      <div className="chart-row chart-head" role="row">
        <span className="chart-label" />
        {COLS.map(([k, plain, term]) => (
          <span key={k} role="columnheader" className={`chart-col${k === 'day' ? ' is-day' : ''}`}>
            <span className="chart-col-main">{plain}</span>
            <span className="chart-col-sub">
              {term}
              <Help term={term} />
            </span>
          </span>
        ))}
      </div>

      <div className="chart-row" role="row">
        <RowLabel term="십성" main="관계" sub="십성" />
        {COLS.map(([k]) =>
          k === 'day' ? (
            <span key={k} className="god-cell">
              <TermButton term="일간" className="god is-me">나 (일간)</TermButton>
            </span>
          ) : (
            <span key={k} className="god-cell">
              {chart.pillars[k] && <TermButton term={chart.pillars[k].stemGod} className="god" />}
            </span>
          )
        )}
      </div>
      <div className="chart-row" role="row">
        <RowLabel term="천간" main="하늘" sub="천간" />
        {COLS.map(([k]) => {
          const p = chart.pillars[k];
          return p ? <Glyph key={k} char={p.stem} ko={p.stemKo} element={p.stemElement} yang={p.stemYang} /> : <div key={k} className="glyph glyph-empty">모름</div>;
        })}
      </div>
      <div className="chart-row" role="row">
        <RowLabel term="지지" main="땅" sub="지지" />
        {COLS.map(([k]) => {
          const p = chart.pillars[k];
          return p ? <Glyph key={k} char={p.branch} ko={p.branchKo} element={p.branchElement} yang={p.branchYang} /> : <div key={k} className="glyph glyph-empty">모름</div>;
        })}
      </div>
      <div className="chart-row" role="row">
        <RowLabel term="십성" main="관계" sub="십성" />
        {COLS.map(([k]) => (
          <span key={k} className="god-cell">
            {chart.pillars[k] && <TermButton term={chart.pillars[k].branchGod} className="god" />}
          </span>
        ))}
      </div>

      <div className="chart-extra">
        <div className="chart-row small" role="row">
          <RowLabel term="지장간" main="숨은 글자" sub="지장간" />
          {COLS.map(([k]) => (
            <span key={k}>{chart.pillars[k]?.hidden.map((h) => h.stemKo).join(' ') ?? ''}</span>
          ))}
        </div>
        <div className="chart-row small" role="row">
          <RowLabel term="십이운성" main="기운 세기" sub="12운성" />
          {COLS.map(([k]) => (
            <span key={k}>{chart.pillars[k]?.stage ?? ''}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
