// 사주 용어 사전 (/dict, /dict/:slug — 2026-11-14). 결과 화면 설명 창과 같은 내용(src/lib/glossary.js).
// 목록에서 용어를 누르면 바로 아래에 뜻이 펼쳐지는 아코디언(사용자 지시 — 따로 글을 여는 방식 아님, 카드 없이 위아래 줄만,
// 함께 보면 좋은 말 없음). 누를 때 화면 위치가 튀지 않게 주소는 바꾸지 않고, 위쪽 칸이 접혀도 누른 칸 자리를 그대로 지킴.
// /dict/:slug 는 검색용 주소: 같은 목록에서 그 용어를 펼친 채로 보여 줌.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GLOSSARY, GOD_GROUPS, DICT_SLUG, termBySlug, dictShort } from '../lib/glossary.js';
import NotFound from './NotFound.jsx';

const GROUPS = [
  { label: '사주의 기본', terms: ['사주원국', '년주', '월주', '일주', '시주', '천간', '지지', '일간', '오행', '음양'] },
  { label: '십성 — 나와의 관계', terms: ['십성', ...GOD_GROUPS.flatMap((g) => g.gods)] },
  { label: '더 깊이 보기', terms: ['지장간', '십이운성', '대운', '세운'] },
];

export default function Dict() {
  const { slug } = useParams();
  const fromUrl = slug ? termBySlug(slug) : null;
  const [open, setOpen] = useState(fromUrl);

  // 검색으로 /dict/일간 에 들어오면 그 용어를 펼치고 그 자리로
  useEffect(() => {
    setOpen(fromUrl);
    if (fromUrl) setTimeout(() => document.getElementById(`dict-${DICT_SLUG[fromUrl]}`)?.scrollIntoView({ block: 'start' }), 0);
  }, [fromUrl]);

  if (slug && !fromUrl) return <NotFound />;

  // 누른 칸의 화면 속 위치를 기억했다가, 다시 그린 뒤 같은 자리에 오도록 스크롤을 맞춤
  const anchor = useRef(null);
  const toggle = (t) => {
    const el = document.getElementById(`dict-${DICT_SLUG[t]}`);
    anchor.current = el ? { id: el.id, top: el.getBoundingClientRect().top } : null;
    setOpen(open === t ? null : t);
  };
  useLayoutEffect(() => {
    const a = anchor.current;
    anchor.current = null;
    const el = a && document.getElementById(a.id);
    if (el) window.scrollBy(0, el.getBoundingClientRect().top - a.top);
  }, [open]);

  return (
    <article className="dict">
      <h1 className="start-title">사주 용어 사전</h1>
      <p className="start-lead">사주 풀이에 나오는 말을 처음 보는 사람도 알기 쉽게 풀었어요. 궁금한 말을 누르면 바로 아래에 뜻이 펼쳐져요.</p>
      {GROUPS.map((g) => (
        <section key={g.label} className="dict-group">
          <h2>{g.label}</h2>
          <ul className="dict-acc">
            {g.terms
              .filter((t) => GLOSSARY[t])
              .map((t) => {
                const on = open === t;
                const id = `dict-${DICT_SLUG[t]}`;
                const item = GLOSSARY[t];
                return (
                  <li key={t} id={id} className={on ? 'is-open' : ''}>
                    <button type="button" className="dict-q" aria-expanded={on} aria-controls={`${id}-a`} onClick={() => toggle(t)}>
                      <span className="dict-q-text">
                        <b>{t}</b>
                        <span>{dictShort(t)}</span>
                      </span>
                      <svg className="dict-chev" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {on && (
                      <div className="dict-a" id={`${id}-a`}>
                        {item.body.map((p) => (
                          <p key={p}>{p}</p>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </article>
  );
}
