// 오늘의 띠별 운세 (/tti, 2026-11-14) — 입력 없이 누구나 보는 12띠 오늘 운세.
// 서버(netlify/functions/tti-daily.mjs)가 하루 한 번 만든 글을 모두에게 같게 보여 줌. 만드는 중이면 3초마다 다시 물음.
// 위쪽 12띠 캐릭터를 누르면 그 띠로 이동. 맨 아래 '내 사주로 자세히' → 생년월일 입력 → 오늘의 운세.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodiacSvg } from '../brand/zodiacArt.js';
import { LuckyPoints } from '../components/DayReport.jsx';
import ResultShare from '../components/ShareRow.jsx';
import { saveTopic } from '../lib/storage.js';
import { trackEvent } from '../lib/analytics.js';

const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
const BRANCH = { 쥐: '子', 소: '丑', 호랑이: '寅', 토끼: '卯', 용: '辰', 뱀: '巳', 말: '午', 양: '未', 원숭이: '申', 닭: '酉', 개: '戌', 돼지: '亥' };
const WEEK = '일월화수목금토';
const dateTitle = (ymd) => {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  return y ? `${m}월 ${d}일 ${WEEK[new Date(y, m - 1, d).getDay()]}요일` : '';
};

export default function Tti() {
  const navigate = useNavigate();
  const [res, setRes] = useState(null); // { date, day, status, data } | { error }

  useEffect(() => {
    let alive = true;
    let timer = 0;
    let tries = 0;
    const load = async () => {
      const r = await fetch('/api/tti-daily', { cache: 'no-store' }).catch(() => null);
      const d = await r?.json().catch(() => null);
      if (!alive) return;
      if (!r?.ok || !d) return setRes({ error: d?.error || '오늘의 띠별 운세를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.' });
      setRes(d);
      if (d.status === 'pending' && tries++ < 30) timer = setTimeout(load, 3000);
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  const jump = (a) => {
    trackEvent('tti_pick', { animal: a });
    document.getElementById(`tti-${a}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const ready = res?.status === 'ready' && res.data;

  return (
    <article className="tti">
      <h1 className="start-title">오늘의 띠별 운세</h1>
      <p className="start-lead">
        {res?.date ? `${dateTitle(res.date)} · 오늘의 일진 ${res.day?.ko}(${res.day?.ganzhi})일` : '천둥도사가 12띠의 오늘 운세를 풀어 드려요.'}
      </p>

      <nav className="tti-picker" aria-label="띠 고르기">
        {ANIMALS.map((a) => (
          <button key={a} type="button" onClick={() => jump(a)} disabled={!ready}>
            <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: zodiacSvg(a, 'good') }} />
            {a}
          </button>
        ))}
      </nav>

      {!res && <p className="hint center">불러오는 중이에요…</p>}
      {res?.status === 'pending' && (
        <div className="tti-wait">
          <span className="moon-spin" aria-hidden="true" />
          <p>천둥도사가 오늘의 12띠 운세를 쓰고 있어요. 조금만 기다려 주세요.</p>
        </div>
      )}
      {res?.error && <p className="notice">{res.error}</p>}

      {ready &&
        ANIMALS.map((a) => {
          const v = res.data[a] || {};
          return (
            <section key={a} id={`tti-${a}`} className="tti-sec card">
              <header className="tti-head">
                <span className="tti-mini" aria-hidden="true" dangerouslySetInnerHTML={{ __html: zodiacSvg(a, 'good') }} />
                <div>
                  <h2>
                    {a}띠 <span className="tti-han">{BRANCH[a]}</span>
                  </h2>
                  <p>{v.summary}</p>
                </div>
              </header>
              <ol className="age-list">
                {Object.entries(v.ages || {}).map(([yy, t]) => (
                  <li key={yy}>
                    <span className="age-yy">
                      {yy}
                      <small>년생</small>
                    </span>
                    <p>{t}</p>
                  </li>
                ))}
              </ol>
              {v.lucky && <LuckyPoints lucky={v.lucky} />}
            </section>
          );
        })}

      <div className="tti-cta">
        <p>띠 운세는 같은 띠라면 모두 같아요. 내 생년월일시로 보면 더 자세해요.</p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            trackEvent('content_click', { content: 'today', from: 'tti' });
            saveTopic('today');
            navigate('/start');
          }}
        >
          내 사주로 오늘의 운세 자세히 보기
        </button>
      </div>
      {ready && (
        <ResultShare
          title="오늘의 띠별 운세를 나눠 보세요"
          path="/tti"
          kakao={{ title: '천둥도사가 본 오늘의 띠별 운세', description: '12띠 오늘 운세와 나이별 운세를 확인해 보세요.', button: '띠별 운세 보기' }}
        />
      )}
    </article>
  );
}
