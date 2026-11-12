import { useEffect, useRef, useState } from 'react';
import { TOPICS } from '../lib/topics.js';
import { trackEvent } from '../lib/analytics.js';
import Markdown from './Markdown.jsx';

const END_MESSAGES = {
  refusal: '이 주제는 풀이를 만들지 못했어요. 다른 주제를 골라 주세요.',
  truncated: '풀이가 길어져 여기서 끝났어요.',
  timeout: '풀이가 오래 걸려 여기서 멈췄어요. 잠시 뒤 다시 시도해 주세요.',
  error: '풀이 중에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.',
};

export default function Reading({ input, initialTopic = null }) {
  const [topic, setTopic] = useState(null);
  const [results, setResults] = useState({}); // topicId -> { text, status, end, error }
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

  const run = async (id) => {
    setTopic(id);
    const prev = results[id];
    if (prev && (prev.status === 'done' || prev.status === 'loading')) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const update = (patch) => setResults((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
    update({ text: '', status: 'loading', end: null, error: null });
    trackEvent('reading_start', { topic: id });

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input, topic: id }),
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
      else update({ status: 'done', text: clean, end: m ? m[1] : null });
      trackEvent(m && !clean.trim() ? 'reading_fail' : 'reading_done', { topic: id, end: m ? m[1] : 'ok' });
    } catch (e) {
      if (e.name === 'AbortError') {
        setResults((r) => {
          const { [id]: _drop, ...rest } = r;
          return rest;
        });
        return;
      }
      update({ status: 'error', error: '네트워크 연결을 확인하고 다시 시도해 주세요.' });
    }
  };

  const cur = topic ? results[topic] : null;

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

      {cur && (
        <article className="reading-body card" aria-live="polite" aria-busy={cur.status === 'loading'}>
          {cur.status === 'loading' && !cur.text && (
            <div className="loading">
              <span className="moon-spin" aria-hidden="true" />
              천둥도사가 원국을 읽고 있어요…
            </div>
          )}
          {cur.text && <Markdown text={cur.text} />}
          {cur.status === 'loading' && cur.text && <span className="cursor" aria-hidden="true" />}
          {cur.end && <p className="notice">{END_MESSAGES[cur.end]}</p>}
          {cur.status === 'error' && (
            <div className="notice">
              <p>{cur.error}</p>
              <button className="btn-ghost" onClick={() => { setResults((r) => ({ ...r, [topic]: undefined })); run(topic); }}>
                다시 시도
              </button>
            </div>
          )}
        </article>
      )}
    </section>
  );
}
