import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { computeSaju, ELEMENT_KO, ELEMENTS } from '../lib/saju.js';
import { loadInput, peekTopic, clearTopic, saveTopic } from '../lib/storage.js';
import ChartTable from '../components/ChartTable.jsx';
import ElementChart from '../components/ElementChart.jsx';
import DaeunList from '../components/DaeunList.jsx';
import Reading from '../components/Reading.jsx';
import { GlossaryProvider, Help, TermButton } from '../components/Glossary.jsx';
import { GOD_SHORT } from '../lib/glossary.js';
import LifeReport from '../components/LifeReport.jsx';

const DAY_MASTER_IMAGE = {
  甲: '곧게 자라는 큰 나무', 乙: '덩굴과 풀꽃', 丙: '하늘의 태양', 丁: '밤을 밝히는 등불', 戊: '넓은 산과 대지',
  己: '곡식을 기르는 밭', 庚: '단단한 바위와 쇠', 辛: '다듬어진 보석', 壬: '큰 강과 바다', 癸: '비와 이슬',
};

export default function Result() {
  const input = loadInput();
  const [params] = useSearchParams();
  const life = params.get("v") === "life"; // 평생 사주 리포트 화면
  const [initialTopic] = useState(peekTopic); // 메인 카드에서 고른 주제
  useEffect(() => clearTopic(), []);
  const chart = useMemo(() => {
    if (!input) return null;
    try {
      return computeSaju(input);
    } catch {
      return null;
    }
  }, [input && JSON.stringify(input)]);

  if (!chart) return <Navigate to="/start" replace />;

  if (life) {
    return (
      <GlossaryProvider>
        <div className="report-top" />
        <LifeReport key={JSON.stringify(input)} chart={chart} input={input} />
        {/* 맨 아래: 다시 보기 (새로 입력한 뒤에도 평생 사주 리포트로) */}
        <div className="report-bottom">
          <Link to="/start" className="btn-primary inline" onClick={() => saveTopic('overall')}>
            사주 다시 보기
          </Link>
        </div>
      </GlossaryProvider>
    );
  }

  const inp = chart.input;
  const dm = chart.dayMaster;
  const strong = ELEMENTS.filter((e) => chart.elements[e] >= 3);
  const missing = ELEMENTS.filter((e) => chart.elements[e] === 0);

  return (
    <GlossaryProvider>
      <section className="result-head">
        <p className="eyebrow">나의 사주</p>
        {/* 제목 줄: 왼쪽 일간 제목, 오른쪽 끝 '사주 다시 보기' */}
        <div className="result-title-row">
          <h1 className="result-title">
            <span className={`dm el-${dm.element}`}>{dm.stem}</span>
            {dm.ko}{ELEMENT_KO[dm.element]} 일간
            <Help term="일간" />
          </h1>
        </div>
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
      </section>

      <section className="block">
        <h2 className="section-title">
          사주 원국 <Help term="사주원국" label="사주 원국" />
          <small>태어난 해·달·날·시를 하늘·땅 글자 두 개씩, 모두 여덟 글자로 나타낸 표</small>
        </h2>
        <ChartTable chart={chart} />
        <p className="chart-guide">
          <b>읽는 법</b> 가운데 <em>태어난 날</em>의 윗글자 <em>{dm.stem}({dm.ko})</em>가 바로 나예요. 나머지 글자는 나와 어떤 관계인지(관계·십성)로 풀이해요. 점선 밑줄이 있는 말을 누르면 뜻을 볼 수 있어요.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">
          오행 분포 <Help term="오행" />
          <small>여덟 글자 속 다섯 기운(나무·불·흙·쇠·물)의 개수</small>
        </h2>
        <ElementChart elements={chart.elements} />
      </section>

      <section className="block">
        <h2 className="section-title">
          대운 <Help term="대운" />
          <small>10년마다 바뀌는 인생의 큰 흐름 · 칸 위는 시작 나이</small>
        </h2>
        <DaeunList chart={chart} />
        <p className="seun">
          <span className="seun-label">
            올해의 기운 <Help term="세운" />
          </span>
          {chart.seun.year}년은 <b>{chart.seun.ganzhi}({chart.seun.ko})년</b>이에요. 나에게는{' '}
          <TermButton term={chart.seun.stemGod} className="god" />({GOD_SHORT[chart.seun.stemGod]}),{' '}
          <TermButton term={chart.seun.branchGod} className="god" />({GOD_SHORT[chart.seun.branchGod]})의 기운이 들어오는 해예요.
        </p>
      </section>

      <section className="block">
        <h2 className="section-title">천둥도사의 사주 풀이</h2>
        <Reading input={inp} initialTopic={initialTopic} />
      </section>
      {/* 맨 아래: 사주 다시 보기 */}
      <div className="report-bottom">
        <Link to="/start" className="btn-primary inline">
          사주 다시 보기
        </Link>
      </div>
    </GlossaryProvider>
  );
}
