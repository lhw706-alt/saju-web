// 무료 사주 (2026-11-15 사용자 지시) — 풀이 비용을 아주 적게 쓰는 기본 사주. 다시 찾아오게(리텐션) 만드는 맛보기.
// 화면에서 계산한 값(일간·오행)은 바로 보여 주고, 천둥도사 풀이는 짧은 한 편(topics.js FREE_TOPIC, 서버 max_tokens 900)만 받음.
// 받은 풀이는 풀이 기억하기로 다시 부르지 않음. 끝에 무료로 매일 볼 수 있는 오늘의 운세와 복채 콘텐츠(평생 사주·신년운세)로 이어 줌.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ELEMENTS, ELEMENT_KO } from '../lib/saju.js';
import { streamReading, END_MESSAGES } from '../lib/stream.js';
import { localParts, rememberPart, serverParts } from '../lib/history.js';
import { saveTopic } from '../lib/storage.js';
import { PRICE_COIN, PRICES } from '../lib/wallet.js';
import { NEXT_YEAR } from '../lib/topics.js';
import { trackEvent } from '../lib/analytics.js';
import Markdown from './Markdown.jsx';
import ElementChart from './ElementChart.jsx';
import { PriceTag } from './BokchaLink.jsx';
import { Help } from './Glossary.jsx';

const KEY = 'free';
const FENCE = String.fromCharCode(96).repeat(3);
const ELEMENT_HANJA = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
const PLAIN = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };

// 맨 앞 json { keyword, color, number } 과 본문을 나눔
function parse(text = '') {
  const m = text.match(new RegExp(`${FENCE}json\\s*([\\s\\S]*?)${FENCE}`));
  let data = null;
  if (m) {
    try {
      data = JSON.parse(m[1]);
    } catch {
      data = null;
    }
  }
  const body = text.replace(new RegExp(`${FENCE}json[\\s\\S]*?(${FENCE}|$)`), '').trim();
  return { data, body };
}

export default function FreeReport({ chart, input, member, image }) {
  const navigate = useNavigate();
  const [st, setSt] = useState({ text: '', status: 'loading', error: '', end: null });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      let memo = localParts(input, KEY)[KEY];
      if (!memo && member) {
        memo = (await serverParts(input, KEY))[KEY];
        if (memo) rememberPart(input, KEY, KEY, memo);
      }
      if (memo) return setSt({ text: memo, status: 'done', error: '', end: null });
      trackEvent('reading_start', { topic: KEY });
      const r = await streamReading({ input, topic: KEY, onText: (text) => setSt((x) => ({ ...x, text })) }).catch(() => ({ error: '네트워크 연결을 확인해 주세요.' }));
      setSt({ text: r.text || '', status: r.error ? 'error' : 'done', error: r.error || '', end: r.end || null });
      if (!r.error && r.text && !r.end) rememberPart(input, KEY, KEY, r.text, { member });
      trackEvent(r.error ? 'reading_fail' : 'reading_done', { topic: KEY });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dm = chart.dayMaster;
  const sorted = [...ELEMENTS].sort((a, b) => chart.elements[b] - chart.elements[a]);
  const strong = sorted[0];
  const missing = ELEMENTS.filter((e) => chart.elements[e] === 0);
  const { data, body } = parse(st.text);
  const go = (topic, path) => {
    trackEvent('content_click', { content: topic, from: 'free_saju' });
    if (path) return navigate(path);
    saveTopic(topic);
    navigate('/start');
  };

  return (
    <article className="free">
      <section className="free-hero">
        <p className="eyebrow">무료 사주</p>
        <div className="free-dm">
          <span className={`dm el-${dm.element}`}>{dm.stem}</span>
          <div>
            <h1 className="free-title">
              나는 {dm.ko}
              {ELEMENT_KO[dm.element]} 일간 <Help term="일간" />
            </h1>
            <p className="free-sub">{image}의 기운을 타고났어요</p>
          </div>
        </div>
        {data?.keyword && <p className="free-keyword">“{data.keyword}”</p>}
        <ul className="free-facts">
          <li>
            <span>가장 강한 기운</span>
            <b>
              {PLAIN[strong]}({ELEMENT_HANJA[strong]})
            </b>
          </li>
          <li>
            <span>비어 있는 기운</span>
            <b>{missing.length ? missing.map((e) => `${PLAIN[e]}(${ELEMENT_HANJA[e]})`).join('·') : '없어요'}</b>
          </li>
          {data?.color && (
            <li>
              <span>나에게 맞는 색</span>
              <b>{data.color}</b>
            </li>
          )}
          {data?.number && (
            <li>
              <span>행운의 숫자</span>
              <b>{data.number}</b>
            </li>
          )}
        </ul>
      </section>

      <section className="free-sec">
        <h2 className="free-h2">
          오행의 균형 <Help term="오행" />
        </h2>
        <ElementChart elements={chart.elements} />
      </section>

      <section className="free-sec" aria-live="polite">
        <h2 className="free-h2">천둥도사의 한마디</h2>
        {body ? <Markdown text={body} /> : st.status === 'loading' ? <p className="hint">천둥도사가 원국을 읽고 있어요…</p> : null}
        {st.status === 'error' && <p className="notice">{st.error}</p>}
        {st.end && <p className="notice">{END_MESSAGES[st.end]}</p>}
      </section>

      <section className="free-next">
        <h2 className="free-h2">더 알고 싶다면</h2>
        <button type="button" className="free-next-row" onClick={() => go('today')}>
          <span>
            <b>오늘의 운세</b>
            <small>매일 바뀌는 내 하루 — 내일 또 와서 확인해 보세요</small>
          </span>
          <em className="free-tag">무료</em>
        </button>
        <button type="button" className="free-next-row" onClick={() => go('overall')}>
          <span>
            <b>평생 사주 리포트</b>
            <small>성향·재물·직업·연애·건강과 10년마다 바뀌는 대운까지</small>
          </span>
          <PriceTag n={PRICES.life.credits} size={16} />
        </button>
        <button type="button" className="free-next-row" onClick={() => go('newyear')}>
          <span>
            <b>{NEXT_YEAR} 신년운세</b>
            <small>한 해의 흐름과 1~12월 달마다의 운</small>
          </span>
          <PriceTag {...PRICE_COIN.newyear} size={16} />
        </button>
      </section>
    </article>
  );
}
