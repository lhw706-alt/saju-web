// 사주 용어 사전 (/dict, /dict/:slug — 2026-11-14). 결과 화면 설명 창과 같은 내용(src/lib/glossary.js)을
// 검색으로도 찾을 수 있게 페이지로 공개. 용어 하나 → 뜻 + 함께 보면 좋은 용어 + '내 사주에서 보기' 버튼.
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GLOSSARY, GOD_GROUPS, DICT_SLUG, termBySlug, dictShort } from '../lib/glossary.js';
import { clearTopic } from '../lib/storage.js';
import NotFound from './NotFound.jsx';

const GROUPS = [
  { label: '사주의 기본', terms: ['사주원국', '년주', '월주', '일주', '시주', '천간', '지지', '일간', '오행', '음양'] },
  { label: '십성 — 나와의 관계', terms: ['십성', ...GOD_GROUPS.flatMap((g) => g.gods)] },
  { label: '더 깊이 보기', terms: ['지장간', '십이운성', '대운', '세운'] },
];
const short = dictShort;

export default function Dict() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const term = slug ? termBySlug(slug) : null;
  if (slug && !term) return <NotFound />;

  if (!term) {
    return (
      <article className="dict">
        <h1 className="start-title">사주 용어 사전</h1>
        <p className="start-lead">사주 풀이에 나오는 말을 처음 보는 사람도 알기 쉽게 풀었어요.</p>
        {GROUPS.map((g) => (
          <section key={g.label} className="dict-group">
            <h2>{g.label}</h2>
            <ul className="dict-list">
              {g.terms.filter((t) => GLOSSARY[t]).map((t) => (
                <li key={t}>
                  <Link to={`/dict/${DICT_SLUG[t]}`}>
                    <b>{t}</b>
                    <span>{short(t)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    );
  }

  const item = GLOSSARY[term];
  return (
    <article className="dict">
      <p className="dict-crumb">
        <Link to="/dict">사주 용어 사전</Link>
      </p>
      <h1 className="start-title">{item.title}</h1>
      <div className="dict-body card">
        {item.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {item.related?.length > 0 && (
        <section className="dict-group">
          <h2>함께 보면 좋은 말</h2>
          <ul className="dict-chips">
            {item.related.filter((r) => DICT_SLUG[r]).map((r) => (
              <li key={r}>
                <Link to={`/dict/${DICT_SLUG[r]}`}>{r}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="dict-cta">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            clearTopic();
            navigate('/start');
          }}
        >
          내 사주에서 {term} 보기
        </button>
      </div>
    </article>
  );
}
