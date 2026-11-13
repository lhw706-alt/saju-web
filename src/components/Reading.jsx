import { useEffect, useRef, useState } from 'react';
import { TOPICS, isDayTopic, dayTopicDate, ymdOf } from '../lib/topics.js';
import { trackEvent } from '../lib/analytics.js';
import Markdown from './Markdown.jsx';
import { localParts, rememberPart, serverParts } from '../lib/history.js';

const END_MESSAGES = {
  refusal: '이 주제는 풀이를 만들지 못했어요. 다른 주제를 골라 주세요.',
  truncated: '풀이가 길어져 여기서 끝났어요.',
  timeout: '풀이가 오래 걸려 여기서 멈췄어요. 잠시 뒤 다시 시도해 주세요.',
  error: '풀이 중에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.',
};

// member: 로그인 회원이면 풀이를 계정 내역에도 저장. 같은 정보·주제로 본 적 있으면 새로 만들지 않고 그대로 보여 줌
export default function Reading({ input, initialTopic = null, member = false }) {
  const [topic, setTopic] = useState(null);
  const [results, setResults] = useState({}); // 풀이 키(주제 id, 하루 운세는 '주제@날짜') -> { text, status, end, error }
  const [picked, setPicked] = useState(''); // 지정일 운세: 입력칸의 날짜
  const [pickedFor, setPickedFor] = useState(null); // 지정일 운세: '이 날 운세 보기'를 누른 날짜
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  // 메인 카드에서 고른 주제가 있으면 바로 시작하고 풀이 위치로 내려 줌
  // (setTimeout: 개발 모드 StrictMode 의 이중 실행에서도 한 번만 요청)
  const rootRef = useRef(null);
  useEffect(() => {
    if (!initialTopic || !TOPICS.some((t) => t.id === initialTopic)) return;
    const timer = setTimeout(() => {
      run(initialTopic);
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTopic]);

  // 하루 운세는 날짜까지 붙인 키로 기억 (날이 바뀌면 새로 풀이)
  const keyOf = (id, date) => (isDayTopic(id) ? (date ? `${id}@${date}` : null) : id);
  const run = async (id, pickDate = null) => {
    setTopic(id);
    const date = isDayTopic(id) ? dayTopicDate(id, pickDate) : null;
    if (isDayTopic(id) && !date) return; // 지정일 운세: 날짜부터 고르기
    const rk = keyOf(id, date);
    const prev = results[rk];
    if (prev && (prev.status === 'done' || prev.status === 'loading')) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const update = (patch) => setResults((r) => ({ ...r, [rk]: { ...r[rk], ...patch } }));
    // 전에 본 풀이 (이 브라우저 → 회원이면 계정)
    let memo = localParts(input, rk)[id];
    if (!memo && member) {
      update({ text: '', status: 'loading', end: null, error: null });
      memo = (await serverParts(input, rk))[id];
      if (memo) rememberPart(input, rk, id, memo);
    }
    if (memo) {
      update({ text: memo, status: 'done', end: null, error: null });
      return;
    }
    update({ text: '', status: 'loading', end: null, error: null });
    trackEvent('reading_start', { topic: id });

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(date ? { input, topic: id, date } : { input, topic: id }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        update({ status: 'error', error: data.error || '풀이를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.' });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        update({ text: text.replace(/\n*\[\[END:\w+\]\]\s*$/, '') });
      }
      const m = text.match(/\[\[END:(\w+)\]\]\s*$/);
      const clean = text.replace(/\n*\[\[END:\w+\]\]\s*$/, '');
      if (m && !clean.trim()) update({ status: 'error', error: END_MESSAGES[m[1]] || END_MESSAGES.error, text: '' });
      else {
        update({ status: 'done', text: clean, end: m ? m[1] : null });
        if (!m) rememberPart(input, rk, id, clean, { member }); // 중간에 끊긴 글은 기억하지 않음
      }
      trackEvent(m && !clean.trim() ? 'reading_fail' : 'reading_done', { topic: id, end: m ? m[1] : 'ok' });
    } catch (e) {
      if (e.name === 'AbortError') {
        setResults((r) => {
          const { [rk]: _drop, ...rest } = r;
          return rest;
        });
        return;
      }
      update({ status: 'error', error: '네트워크 연결을 확인하고 다시 시도해 주세요.' });
    }
  };

  const curDate = topic && isDayTopic(topic) ? dayTopicDate(topic, pickedFor) : null;
  const curKey = topic ? keyOf(topic, curDate) : null;
  const cur = curKey ? results[curKey] : null;
  const today = ymdOf();
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 365);
    return ymdOf(d);
  })();
  const dayTitle = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return `${y}년 ${m}월 ${d}일 ${'일월화수목금토'[new Date(y, m - 1, d).getDay()]}요일`;
  };
  const pickOk = /^\d{4}-\d{2}-\d{2}$/.test(picked) && picked >= today && picked <= maxDate;

  return (
    <section className="reading" ref={rootRef}>
      <div className="topics" role="tablist" aria-label="풀이 주제">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={topic === t.id}
            className={`topic${topic === t.id ? ' on' : ''}`}
            onClick={() => run(t.id)}
          >
            <strong>{t.label}</strong>
            <span>{t.desc}</span>
          </button>
        ))}
      </div>

      {!topic && <p className="hint center">궁금한 주제를 고르면 천둥도사가 풀이를 시작해요.</p>}

      {topic === 'date' && (
        <form
          className="day-pick card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!pickOk) return;
            setPickedFor(picked);
            run('date', picked);
          }}
        >
          <label htmlFor="day-pick" className="day-pick-label">
            운세를 볼 날을 골라 주세요 <small>오늘부터 1년 안의 날을 볼 수 있어요</small>
          </label>
          <div className="day-pick-row">
            <span className="input">
              <input id="day-pick" type="date" min={today} max={maxDate} value={picked} onChange={(e) => setPicked(e.target.value)} required />
            </span>
            <button type="submit" className="btn-primary inline" disabled={!pickOk}>
              이 날 운세 보기
            </button>
          </div>
        </form>
      )}

      {cur && (
        <article className="reading-body card" aria-live="polite" aria-busy={cur.status === 'loading'}>
          {cur.status === 'loading' && !cur.text && (
            <div className="loading">
              <span className="moon-spin" aria-hidden="true" />
              천둥도사가 원국을 읽고 있어요…
            </div>
          )}
          {curDate && <p className="day-head">{dayTitle(curDate)}의 운세</p>}
          {cur.text && <Markdown text={cur.text} />}
          {cur.status === 'loading' && cur.text && <span className="cursor" aria-hidden="true" />}
          {cur.end && <p className="notice">{END_MESSAGES[cur.end]}</p>}
          {cur.status === 'error' && (
            <div className="notice">
              <p>{cur.error}</p>
              <button className="btn-ghost" onClick={() => { setResults((r) => ({ ...r, [curKey]: undefined })); run(topic, pickedFor); }}>
                다시 시도
              </button>
            </div>
          )}
        </article>
      )}
    </section>
  );
}
