// 대운: 가로 스크롤 없이 여러 줄로 감싸서 한눈에 (휴대폰 5칸씩)
export default function DaeunList({ chart }) {
  const current = chart.currentDaeun?.ganzhi;
  return (
    <ol className="daeun" aria-label="대운">
      {chart.daeun.map((d) => (
        <li key={d.startYear} className={`daeun-item${d.ganzhi === current ? ' is-now' : ''}`} aria-current={d.ganzhi === current ? 'true' : undefined}>
          <span className="daeun-age">{d.startAge}세</span>
          <span className="daeun-gz">{d.ganzhi}</span>
          <span className="daeun-ko">{d.ko}</span>
          <span className="daeun-year">{d.startYear}</span>
          {d.ganzhi === current && <span className="daeun-now">지금</span>}
        </li>
      ))}
    </ol>
  );
}
