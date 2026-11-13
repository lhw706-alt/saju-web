import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import StepForm from '../components/StepForm.jsx';
import { saveInput, savePartner, peekTopic, markFresh } from '../lib/storage.js';
import { topicById } from '../lib/topics.js';
import { trackEvent } from '../lib/analytics.js';
import { guestCanView, markGuestView, pairKey } from '../lib/history.js';
import { isDayTopic } from '../lib/topics.js';
import { presetMain } from '../lib/presetText.js';
import { ShareButtons } from '../components/ShareRow.jsx';

// 콘텐츠를 고른 뒤 생년월일시를 넣는 화면 (메인에서는 입력 폼을 뺐다).
// 입력은 한 항목씩 순서대로 묻는 단계형(StepForm). 궁합은 나 → 상대 두 번 입력.
export default function Start() {
  const navigate = useNavigate();
  const topic = topicById(peekTopic());
  const isMatch = topic?.id === 'match';
  // 로그인 회원이 마이페이지에 등록한 내 사주 정보 → 입력 첫 화면에서 '내 정보'로 미리 선택
  const { auth, openLogin, notify } = useOutletContext();
  const [mine, setMine] = useState(null);
  const [me, setMe] = useState(null); // 궁합: 먼저 입력한 내 정보
  const [invite, setInvite] = useState(null); // 궁합 초대 링크 토큰 (상대가 직접 입력)
  const [inviting, setInviting] = useState(false);
  useEffect(() => {
    if (!auth.user) return setMine(null);
    fetch('/api/auth/me?full=1', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMine(d?.user?.birth || null))
      .catch(() => {});
  }, [auth.user]);

  // 비회원은 2번까지 (같은 사람·같은 궁합은 다시 볼 수 있음). 3번째부터 천둥도사가 로그인을 권함
  const guestOk = (key) => {
    if (auth.user) return true;
    if (!guestCanView(key)) {
      trackEvent('guest_limit');
      openLogin('천둥도사가 기운을 아끼는 중이에요. 로그인하면 계속 사주를 볼 수 있어요.');
      return false;
    }
    markGuestView(key);
    return true;
  };

  // 상대 정보를 모르면: 초대 링크를 만들어 보내고, 상대가 직접 입력 (회원만)
  const makeInvite = async () => {
    if (!auth.user) return openLogin('궁합 초대 링크는 천둥도사가 회원에게만 만들어 드려요. 로그인해 주세요.');
    setInviting(true);
    const r = await fetch('/api/invite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: me }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setInviting(false);
    if (!r?.ok) return notify(d?.error || '링크를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.', 'negative');
    setInvite(d.token);
    trackEvent('invite_create');
  };

  const onSubmit = (input) => {
    if (isMatch && !me) {
      setMe(input); // 다음은 상대 정보
      window.scrollTo(0, 0);
      return;
    }
    if (isMatch) {
      if (!guestOk(pairKey(me, input))) return;
      trackEvent('saju_submit', { time_known: me.timeKnown && input.timeKnown ? 'yes' : 'no', topic: 'match' });
      saveInput(me);
      savePartner(input);
      markFresh();
      navigate('/result?v=match');
      return;
    }
    if (!guestOk(input)) return;
    trackEvent('saju_submit', { time_known: input.timeKnown ? 'yes' : 'no' }); // 생년월일·성별은 보내지 않음
    saveInput(input);
    markFresh(); // 결과 화면에서 천둥도사 로딩을 한 번 보여 줌
    const t = peekTopic();
    // 평생 사주는 리포트 화면, 오늘·내일·지정일 운세는 하루 운세 화면
    navigate(t === 'overall' ? '/result?v=life' : isDayTopic(t) ? `/result?v=day&t=${t}` : '/result');
  };

  return (
    <section className="start">
      <h1 className="start-title">{topic ? (topic.id === 'overall' ? '평생 사주' : topic.label) : '내 사주 보기'}</h1>
      {isMatch ? (
        <>
          <ol className="pair-steps" aria-label="궁합 입력 순서">
            <li className={me ? 'is-done' : 'is-on'}>
              <b>1</b> 내 정보{me && <span>{presetMain(me)}</span>}
            </li>
            <li className={me ? 'is-on' : ''}>
              <b>2</b> 상대 정보
            </li>
          </ol>
          <p className="start-lead">{me ? '이제 궁합을 볼 상대의 생년월일시를 알려 주세요.' : '먼저 내 생년월일시를 알려 주세요.'}</p>
          {me ? (
            <>
              <StepForm key="partner" onSubmit={onSubmit} submitLabel="궁합 보기" />
              <div className="invite-box card">
                {invite ? (
                  <>
                    <b>초대 링크를 만들었어요</b>
                    <p>상대가 링크를 열어 자기 생년월일시를 넣으면 바로 궁합을 볼 수 있어요. 결과는 마이페이지 '내 사주 정보'에서도 볼 수 있어요. 링크는 7일 동안 열려요.</p>
                    <ShareButtons
                      kakao={{ title: `${auth.user?.nick || '친구'}님이 궁합을 보자고 해요`, description: '생년월일시만 넣으면 천둥도사가 두 사람의 궁합을 풀어 드려요.', button: '궁합 보기' }}
                      path={`/match/${invite}`}
                      loggedIn={!!auth.user}
                      onNeedLogin={openLogin}
                      onNotice={notify}
                      event="invite_share"
                    />
                  </>
                ) : (
                  <>
                    <b>상대의 생년월일시를 모르나요?</b>
                    <p>링크를 보내면 상대가 직접 입력해요. 두 사람 모두 궁합 결과를 볼 수 있어요.</p>
                    <button type="button" className="my-set" onClick={makeInvite} disabled={inviting}>
                      {inviting ? '만드는 중…' : '상대에게 링크 보내기'}
                    </button>
                  </>
                )}
              </div>
              <button type="button" className="my-link pair-back" onClick={() => { setMe(null); setInvite(null); }}>
                내 정보 다시 입력하기
              </button>
            </>
          ) : (
            <StepForm key="me" mine={mine} onSubmit={onSubmit} submitLabel="다음: 상대 정보" />
          )}
        </>
      ) : (
        <>
          <p className="start-lead">생년월일시를 알려 주면 천둥도사가 여덟 글자를 펼쳐 풀어 드려요.</p>
          <StepForm mine={mine} onSubmit={onSubmit} />
        </>
      )}
    </section>
  );
}
