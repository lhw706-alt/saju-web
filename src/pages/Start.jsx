import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import StepForm from '../components/StepForm.jsx';
import { saveInput, peekTopic, markFresh } from '../lib/storage.js';
import { topicById } from '../lib/topics.js';
import { trackEvent } from '../lib/analytics.js';
import { guestCanView, markGuestView } from '../lib/history.js';

// 콘텐츠를 고른 뒤 생년월일시를 넣는 화면 (메인에서는 입력 폼을 뺐다).
// 입력은 한 항목씩 순서대로 묻는 단계형(StepForm)
export default function Start() {
  const navigate = useNavigate();
  const topic = topicById(peekTopic());
  // 로그인 회원이 마이페이지에 등록한 내 사주 정보 → 입력 첫 화면에서 '내 정보'로 미리 선택
  const { auth, openLogin } = useOutletContext();
  const [mine, setMine] = useState(null);
  useEffect(() => {
    if (!auth.user) return setMine(null);
    fetch('/api/auth/me?full=1', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMine(d?.user?.birth || null))
      .catch(() => {});
  }, [auth.user]);

  const onSubmit = (input) => {
    // 비회원은 서로 다른 사람 2명까지 (이미 본 사람은 다시 볼 수 있음). 3번째부터 로그인
    if (!auth.user) {
      if (!guestCanView(input)) {
        trackEvent('guest_limit');
        openLogin('천둥도사가 기운을 아끼는 중이에요. 로그인하면 계속 사주를 볼 수 있어요.');
        return;
      }
      markGuestView(input);
    }
    trackEvent('saju_submit', { time_known: input.timeKnown ? 'yes' : 'no' }); // 생년월일·성별은 보내지 않음
    saveInput(input);
    markFresh(); // 결과 화면에서 천둥도사 로딩을 한 번 보여 줌
    navigate(peekTopic() === 'overall' ? '/result?v=life' : '/result'); // 평생 사주는 리포트 화면
  };

  return (
    <section className="start">
      <h1 className="start-title">{topic ? (topic.id === 'overall' ? '평생 사주' : topic.label) : '내 사주 보기'}</h1>
      <p className="start-lead">생년월일시를 알려 주면 천둥도사가 여덟 글자를 펼쳐 풀어 드려요.</p>
      <StepForm mine={mine} onSubmit={onSubmit} />
    </section>
  );
}
