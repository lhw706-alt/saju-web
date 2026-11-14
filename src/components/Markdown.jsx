// '## 제목'(h3), '### 소제목'(h4), '- 항목', '**굵게**' 만 지원하는 작은 렌더러 (HTML 을 직접 넣지 않음)
// 2026-11-15 사용자 지시: 풀이 글 속 사주 용어(용어 사전에 있는 말)에 밑줄 — 누르면 설명 창(GlossaryProvider 안에서만).
// 같은 글에서 한 용어는 처음 나올 때만 밑줄 (글이 지저분해지지 않게).
import { useGlossary } from './Glossary.jsx';
import { GLOSSARY } from '../lib/glossary.js';

// 흔한 말과 겹쳐 잘못 잡히기 쉬운 용어는 자동 밑줄에서 뺌 (지지=응원, 상관=관계없다, 세운=세우다, 합=합격, 인성=사람됨)
const SKIP = new Set(['지지', '상관', '세운', '합', '인성']);
const ALIAS = { 사주팔자: '사주원국' };
const TERMS = [...Object.keys(GLOSSARY).filter((t) => !SKIP.has(t)), ...Object.keys(ALIAS)].sort((a, b) => b.length - a.length);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// 앞이 한글이 아니어야(낱말 중간 X). 한 글자 용어(충)는 뒤에 조사만 오거나 한글이 아니어야 함
const TERM_RE = new RegExp(
  `(?<![가-힣])(${TERMS.map((t) => (t.length === 1 ? `${esc(t)}(?=(?:을|이|은|의|과|으로|도|에|이라|이에요|이고)?(?![가-힣]))` : esc(t))).join('|')})`,
  'g'
);

function linkTerms(text, open, seen, keyBase) {
  if (!open) return [text];
  const out = [];
  let last = 0;
  let m;
  TERM_RE.lastIndex = 0;
  while ((m = TERM_RE.exec(text))) {
    const word = m[1];
    const term = ALIAS[word] || word;
    if (seen.has(term) || !GLOSSARY[term]) continue;
    seen.add(term);
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <button key={`${keyBase}-${m.index}`} type="button" className="md-term" onClick={() => open(term)} aria-label={`${word} 뜻 보기`}>
        {word}
      </button>
    );
    last = m.index + word.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function inline(text, open, seen, key) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i}>{linkTerms(part.slice(2, -2), open, seen, `${key}-${i}`)}</strong>
    ) : (
      <span key={i}>{linkTerms(part, open, seen, `${key}-${i}`)}</span>
    )
  );
}

export default function Markdown({ text, terms = true }) {
  const ctx = useGlossary();
  const open = terms ? ctx : null;
  const seen = new Set();
  const blocks = [];
  let para = [];
  let list = [];
  const flush = () => {
    const k = blocks.length;
    if (para.length) blocks.push(<p key={k}>{inline(para.join(' '), open, seen, `p${k}`)}</p>);
    if (list.length) blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{inline(l, open, seen, `l${k}-${i}`)}</li>)}</ul>);
    para = [];
    list = [];
  };
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) flush();
    else if (/^#{3,4}\s/.test(line)) {
      flush();
      blocks.push(<h4 key={blocks.length}>{line.replace(/^#+\s*/, '')}</h4>);
    } else if (/^#{1,2}\s/.test(line)) {
      flush();
      blocks.push(<h3 key={blocks.length}>{line.replace(/^#+\s*/, '')}</h3>);
    } else if (/^[-*]\s/.test(line)) {
      if (para.length) flush();
      list.push(line.slice(2));
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();
  return <>{blocks}</>;
}
