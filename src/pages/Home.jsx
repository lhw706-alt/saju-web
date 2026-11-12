import { useNavigate } from 'react-router-dom';
import BirthForm from '../components/BirthForm.jsx';
import { saveInput, loadInput } from '../lib/storage.js';
import { TOPICS } from '../lib/topics.js';

export default function Home() {
  const navigate = useNavigate();
  const onSubmit = (input) => {
    saveInput(input);
    navigate('/result');
  };

  return (
    <>
      <section className="hero">
        <p className="eyebrow">만세력 · AI 사주 풀이</p>
        <h1>
          달빛 아래 펼쳐 보는
          <br />
          <em>나의 여덟 글자</em>
        </h1>
        <p className="lead">
          생년월일시를 넣으면 여덟 글자(사주 원국)와 오행·대운을 바로 계산하고,
          <br className="pc" /> AI가 원국의 어느 글자에서 그렇게 읽었는지 근거와 함께 풀어 드려요.
        </p>
      </section>

      <BirthForm initial={loadInput() || undefined} onSubmit={onSubmit} />

      <section className="features">
        <h2 className="section-title">이렇게 풀어 드려요</h2>
        <ul className="feature-list">
          <li>
            <strong>정확한 만세력</strong>
            <span>절기 시각으로 연주·월주를, 출생지 경도와 과거 서머타임까지 반영해 시주를 정해요.</span>
          </li>
          <li>
            <strong>오행과 십성</strong>
            <span>나무·불·흙·쇠·물 다섯 기운의 균형과 일간을 기준으로 한 관계를 한눈에 보여 줘요.</span>
          </li>
          <li>
            <strong>주제별 AI 풀이</strong>
            <span>{TOPICS.map((t) => t.label).join(' · ')} 가운데 궁금한 주제를 골라 보세요.</span>
          </li>
        </ul>
      </section>
    </>
  );
}
