export default function DaeunList({ chart }) {
  const current = chart.currentDaeun?.ganzhi;
  return (
    <div className="daeun" aria-label="대운">
      {chart.daeun.map((d) => (
        <div key={d.startYear} className={`daeun-item${d.ganzhi === current ? ' is-now' : ''}`}>
          <span className="daeun-age">{d.startAge}세</span>
          <span className="daeun-gz">{d.ganzhi}</span>
          <span className="daeun-ko">{d.ko}</span>
          <span className="daeun-year">{d.startYear}</span>
          {d.ganzhi === current && <span className="daeun-now">지금</span>}
        </div>
      ))}
    </div>
  );
}
