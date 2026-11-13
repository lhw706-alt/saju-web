// 궁합 초대 받은 화면 (/match/:token) — 2026-11-13
// 초대한 사람(회원)의 닉네임을 보여 주고, 받은 사람이 자기 생년월일시를 넣으면 바로 두 사람의 궁합 결과로.
// 받은 사람의 정보는 초대한 사람도 궁합을 볼 수 있게 초대 기록에 저장됨(화면에 안내). 비회원도 볼 수 있음(가입 유도는 결과 화면).
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import StepForm from '../components/StepForm.jsx';
import { saveInput, savePartner, savePartnerName, markFresh, saveTopic } from '../lib/storage.js';
import { trackEvent } from '../lib/analytics.js';

export default function MatchInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState(null); // { nick, input } | { error }
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`/api/invite?token=${encodeURIComponent(token || '')}`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        setInv(r.ok && d?.input ? d : { error: d?.error || '초대 링크를 열지 못했어요.' });
      })
      .catch(() => setInv({ error: '네트워크 연결을 확인해 주세요.' }));
    trackEvent('invite_open');
  }, [token]);

  const onSubmit = async (mine) => {
    setErr('');
    const r = await fetch('/api/invite/done', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, partner: mine }),
    }).catch(() => null);
    if (!r?.ok) {
      const d = await r?.json().catch(() => ({}));
      return setErr(d?.error || '잠시 뒤 다시 시도해 주세요.');
    }
    trackEvent('invite_done');
    // 받은 사람 입장에서: '나' = 받은 사람, '상대' = 초대한 사람(닉네임으로, 생년월일은 숨김)
    saveInput(mine);
    savePartner(inv.input);
    savePartnerName(inv.nick);
    markFresh();
    navigate('/result?v=match');
  };

  if (!inv) return <section className="start" />;

  if (inv.error) {
    return (
      <section className="start">
        <h1 className="start-title">궁합 초대</h1>
        <div className="my-sec card">
          <p className="my-sec-note">{inv.error} 초대한 사람에게 새 링크를 받아 주세요.</p>
          <Link to="/start" className="btn-primary inline" onClick={() => saveTopic('match')}>
            직접 궁합 보러 가기
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="start">
      <h1 className="start-title">{inv.nick}님이 궁합을 보자고 해요</h1>
      <p className="start-lead">내 생년월일시를 넣으면 천둥도사가 두 사람의 궁합을 바로 풀어 드려요.</p>
      <p className="invite-note">입력한 정보로 본 궁합은 {inv.nick}님도 볼 수 있어요. 이름이나 연락처는 받지 않아요.</p>
      {err && <p className="field-msg">{err}</p>}
      <StepForm onSubmit={onSubmit} submitLabel="궁합 보기" />
    </section>
  );
}
