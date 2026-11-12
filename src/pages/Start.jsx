import { useNavigate } from 'react-router-dom';
import StepForm from '../components/StepForm.jsx';
import { saveInput, loadInput, peekTopic } from '../lib/storage.js';
import { topicById } from '../lib/topics.js';
import { trackEvent } from '../lib/analytics.js';

// 콘텐츠를 고른 뒤 생년월일시를 넣는 화면 (메인에서는 입력 폼을 뺐다).
// 입력은 한 항목씩 순서대로 묻는 단계형(StepForm)
export default function Start() {
  const navigate = useNavigate();
  const topic = topicById(peekTopic());

  const onSubmit = (input) => {
    trackEvent('saju_submit', { time_known: input.timeKnown ? 'yes' : 'no' }); // 생년월일·성별은 보내지 않음
    saveInput(input);
    navigate('/result');
  };

  return (
    <section className="start">
      <h1 className="start-title">{topic ? topic.label : '내 사주 보기'}</h1>
      <p className="start-lead">생년월일시를 알려 주면 천둥도사가 여덟 글자를 펼쳐 풀어 드려요.</p>
      <StepForm initial={loadInput() || undefined} onSubmit={onSubmit} />
    </section>
  );
}
