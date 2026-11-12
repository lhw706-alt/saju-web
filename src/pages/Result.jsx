import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { computeSaju, ELEMENT_KO, ELEMENTS } from '../lib/saju.js';
import { loadInput } from '../lib/storage.js';
import ChartTable from '../components/ChartTable.jsx';
import ElementChart from '../components/ElementChart.jsx';
import DaeunList from '../components/DaeunList.jsx';
import Reading from '../components/Reading.jsx';

const DAY_MASTER_IMAGE = {
  甲: '곧게 자라는 큰 나무', 乙: '덩굴과 풀꽃', 丙: '하늘의 태양', 丁: '밤을 밝히는 등불', 戊: '넓은 산과 대지',
  己: '곡식을 기르는 밭', 庚: '단단한 바위와 쇠', 辛: '다듬어진 보석', 壬: '큰 강과 바다', 癸: '비와 이슬',
};

export default function Result() {
  const input = loadInput();
  const chart = useMemo(() => {
    if (!input) return null;
    try {
      return computeSaju(input);
    } catch {
      return null;
    }
  }, [input && JSON.stringify(input)]);

  if (!chart) return <Navigate to="/" replace />;

  const inp = chart.input;
  const dm = chart.dayMaster;
  const strong = ELEMENTS.filter((e) => chart.elements[e] >= 3);
  const missing = ELEMENTS.filter((e) => chart.elements[e] === 0);

  return (
    <>
      <section className="result-head">
        <p className="eyebrow">사주 원국</p>
        <h1 className="result-title">
          <span className={`dm el-${dm.element}`}>{dm.stem}</span>
          {dm.ko}{ELEMENT_KO[dm.element]} 일간
        </h1>
        <p className="lead">
          {DAY_MASTER_IMAGE[dm.stem]}의 기운을 타고났어요.
          {strong.length > 0 && ` ${strong.map((e) => ELEMENT_KO[e]).join('·')} 기운이 두드러지고`}
          {missing.length > 0 ? ` ${missing.map((e) => ELEMENT_KO[e]).join('·')} 기운은 원국에 없어요.` : strong.length > 0 ? '요.' : ' 다섯 기운이 고루 있는 편이에요.'}
        </p>
        <dl className="meta">
          <div><dt>{inp.calendar === 'lunar' ? '음력' : '양력'}</dt><dd>{inp.year}.{inp.month}.{inp.day}{inp.leap ? ' (윤달)' : ''}</dd></div>
          <div><dt>{inp.calendar === 'lunar' ? '양력' : '음력'}</dt><dd>{inp.calendar === 'lunar' ? chart.solarDate : chart.lunarDate}</dd></div>
          <div><dt>시각</dt><dd>{inp.timeKnown ? `${String(inp.hour).padStart(2, '0')}:${String(inp.minute).padStart(2, '0')}` : '모름'}</dd></div>
          {chart.localTime && inp.city !== 'none' && (
            <div><dt>보정 시각</dt><dd>{chart.localTime.slice(11)} ({chart.cityName})</dd></div>
          )}
          <div><dt>성별·띠</dt><dd>{inp.gender === 'male' ? '남성' : '여성'} · {chart.animal}띠</dd></div>
        </dl>
        <Link to="/" className="btn-ghost">다시 입력</Link>
      </section>

      <section className="block">
        <h2 className="section-title">여덟 글자</h2>
        <ChartTable chart={chart} />
      </section>

      <section className="block">
        <h2 className="section-title">오행 분포</h2>
        <ElementChart elements={chart.elements} />
      </section>

      <section className="block">
        <h2 className="section-title">
          대운 <small>10년마다 바뀌는 큰 흐름 · {chart.daeunStart.forward ? '순행' : '역행'}</small>
        </h2>
        <DaeunList chart={chart} />
        <p className="hint">
          {chart.seun.year}년은 {chart.seun.ganzhi}({chart.seun.ko})년 — 내 일간에서 보면 천간은 {chart.seun.stemGod}, 지지는 {chart.seun.branchGod}의 해예요.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">AI 사주 풀이</h2>
        <Reading input={inp} />
      </section>
    </>
  );
}
