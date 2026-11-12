// '## 제목'(h3), '### 소제목'(h4), '- 항목', '**굵게**' 만 지원하는 작은 렌더러 (HTML 을 직접 넣지 않음)
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}

export default function Markdown({ text }) {
  const blocks = [];
  let para = [];
  let list = [];
  const flush = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(' '))}</p>);
    if (list.length) blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    para = [];
    list = [];
  };
  for (const raw of text.split('\n')) {
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
