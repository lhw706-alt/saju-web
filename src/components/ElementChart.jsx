import { ELEMENTS, ELEMENT_KO, ELEMENT_HANJA } from '../lib/saju.js';

const NAME = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };

export default function ElementChart({ elements }) {
  const total = ELEMENTS.reduce((s, e) => s + elements[e], 0);
  const max = Math.max(...ELEMENTS.map((e) => elements[e]), 1);
  return (
    <ul className="elements" aria-label={`오행 분포, 전체 ${total}글자`}>
      {ELEMENTS.map((e) => (
        <li key={e} className={`el-${e}`}>
          <span className="el-name">
            <b>{ELEMENT_HANJA[e]}</b> {ELEMENT_KO[e]}<small>{NAME[e]}</small>
          </span>
          <span className="el-track">
            <span className="el-bar" style={{ width: `${(elements[e] / max) * 100}%` }} />
          </span>
          <span className="el-count">{elements[e]}</span>
        </li>
      ))}
    </ul>
  );
}
