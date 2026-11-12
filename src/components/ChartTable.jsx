import { ELEMENT_KO } from '../lib/saju.js';
import { TermButton } from './Glossary.jsx';

// 전통 표기 순서: 오른쪽부터 년·월·일·시 → 화면에서는 왼쪽부터 시·일·월·년
// 처음 보는 사람도 읽을 수 있게 '태어난 날'·'관계' 같은 쉬운 말만 보이고, 누르면 용어(일주·십성 등) 설명 창
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

// 줄 이름 자체가 버튼: 누르면 그 용어 설명 창
function RowLabel({ term, main }) {
  return (
    <span className="chart-label">
      <TermButton term={term} className="chart-label-btn">
        {main}
      </TermButton>
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
            <TermButton term={term} className="chart-col-btn">
              {plain}
            </TermButton>
          </span>
        ))}
      </div>

      <div className="chart-row" role="row">
        <RowLabel term="십성" main="관계" />
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
        <RowLabel term="천간" main="하늘" />
        {COLS.map(([k]) => {
          const p = chart.pillars[k];
          return p ? <Glyph key={k} char={p.stem} ko={p.stemKo} element={p.stemElement} yang={p.stemYang} /> : <div key={k} className="glyph glyph-empty">모름</div>;
        })}
      </div>
      <div className="chart-row" role="row">
        <RowLabel term="지지" main="땅" />
        {COLS.map(([k]) => {
          const p = chart.pillars[k];
          return p ? <Glyph key={k} char={p.branch} ko={p.branchKo} element={p.branchElement} yang={p.branchYang} /> : <div key={k} className="glyph glyph-empty">모름</div>;
        })}
      </div>
      <div className="chart-row" role="row">
        <RowLabel term="십성" main="관계" />
        {COLS.map(([k]) => (
          <span key={k} className="god-cell">
            {chart.pillars[k] && <TermButton term={chart.pillars[k].branchGod} className="god" />}
          </span>
        ))}
      </div>

      <div className="chart-extra">
        <div className="chart-row small" role="row">
          <RowLabel term="지장간" main="숨은 글자" />
          {COLS.map(([k]) => (
            <span key={k}>{chart.pillars[k]?.hidden.map((h) => h.stemKo).join(' ') ?? ''}</span>
          ))}
        </div>
        <div className="chart-row small" role="row">
          <RowLabel term="십이운성" main="기운 세기" />
          {COLS.map(([k]) => (
            <span key={k}>{chart.pillars[k]?.stage ?? ''}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
