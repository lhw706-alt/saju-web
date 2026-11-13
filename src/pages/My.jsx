// 마이페이지 (/my): 상단 닉네임을 누르면 이동. 내 정보 · 내 사주 정보(계정에 저장) · 저장된 사주 정보(이 브라우저) · 계정
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { CITIES } from '../lib/saju.js';
import { LogoSymbol } from '../components/Logo.jsx';
import StepForm from '../components/StepForm.jsx';
import { loadPresets, removePreset } from '../lib/storage.js';

const presetMain = (p) => `${p.year}.${p.month}.${p.day} · ${p.gender === 'male' ? '남성' : '여성'}`;
const presetSub = (p) => {
  const city = CITIES.find((c) => c.id === p.city)?.name || '';
  const time = p.timeKnown ? `${String(p.hour).padStart(2, '0')}:${String(p.minute || 0).padStart(2, '0')}` : '시각 모름';
  return [p.calendar === 'lunar' ? `음력${p.leap ? '(윤달)' : ''}` : '양력', time, city].join(' · ');
};

export default function My() {
  const navigate = useNavigate();
  const { auth, openLogin, logout, withdraw } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [presets, setPresets] = useState(loadPresets);
  const [editing, setEditing] = useState(false); // 내 사주 정보 등록·수정 중
  const [birthMsg, setBirthMsg] = useState('');

  useEffect(() => {
    if (!auth.user) return;
    fetch('/api/auth/me?full=1', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProfile(d?.user || null))
      .catch(() => {});
  }, [auth.user]);

  // 내 사주 정보 저장(계정) / 삭제
  const saveBirth = async (input) => {
    setBirthMsg('');
    const r = await fetch('/api/auth/birth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) return setBirthMsg(d?.error || '저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    setProfile((pf) => ({ ...(pf || auth.user), birth: d.birth }));
    setEditing(false);
    setPresets(loadPresets()); // 입력 화면이 이 브라우저 목록에도 기억해 둠
    setBirthMsg('내 사주 정보를 저장했어요.');
  };
  const deleteBirth = async () => {
    if (!window.confirm('저장된 내 사주 정보를 지울까요?')) return;
    const r = await fetch('/api/auth/birth', { method: 'DELETE' }).catch(() => null);
    if (r?.ok) {
      setProfile((pf) => ({ ...(pf || auth.user), birth: null }));
      setBirthMsg('내 사주 정보를 지웠어요.');
    } else setBirthMsg('지우지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  };


  if (!auth.ready) return <section className="my" />;

  if (!auth.user) {
    return (
      <section className="my">
        <h1 className="start-title">마이페이지</h1>
        <div className="my-card card my-empty">
          <p>로그인하면 내 정보를 볼 수 있어요.</p>
          <button type="button" className="btn-primary inline" onClick={openLogin}>
            로그인
          </button>
        </div>
      </section>
    );
  }

  const p = profile || auth.user;
  return (
    <section className="my">
      <h1 className="start-title">마이페이지</h1>

      <div className="my-card card">
        <div className="my-hello">
          {/* 기본 프로필 사진: 천둥도사(천동이) */}
          <span className="my-avatar" aria-hidden="true">
            <LogoSymbol size={44} />
          </span>
          <div>
            <b>{p.nick || '사주천문 회원'}님</b>
            <span>카카오로 로그인했어요</span>
          </div>
        </div>
        {/* 가입일·방문 횟수 대신 내 사주 정보 (계정에 저장 — 다른 기기에서도 그대로) */}
        <div className="my-birth">
          {editing ? (
            <div className="my-birth-info">
              <span className="my-birth-label">내 사주 정보</span>
              <span>아래에서 입력하고 저장해 주세요.</span>
            </div>
          ) : p.birth ? (
            <>
              <div className="my-birth-info">
                <span className="my-birth-label">내 사주 정보</span>
                <b>{presetMain(p.birth)}</b>
                <span>{presetSub(p.birth)}</span>
              </div>
              <div className="my-birth-actions">
                <button type="button" className="my-link" onClick={() => setEditing(true)}>
                  수정
                </button>
                <button type="button" className="my-link" onClick={deleteBirth}>
                  삭제
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="my-birth-info">
                <span className="my-birth-label">내 사주 정보</span>
                <span>생년월일과 태어난 시각을 등록하면 다른 기기에서도 바로 내 사주를 볼 수 있어요.</span>
              </div>
              <div className="my-birth-actions">
                <button type="button" className="btn-primary inline" onClick={() => setEditing(true)}>
                  내 정보 등록하기
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="my-edit">
          <StepForm initial={p.birth || undefined} showSaved={false} submitLabel="저장하기" onSubmit={saveBirth} />
          <button type="button" className="my-link" onClick={() => setEditing(false)}>
            취소
          </button>
        </div>
      )}
      {birthMsg && (
        <p className="my-msg" role="status">
          {birthMsg}
        </p>
      )}

      <h2 className="section-title my-title">
        저장된 사주 정보 <small>이 브라우저에 최근 5명까지 기억해요</small>
      </h2>
      {presets.length === 0 ? (
        <p className="my-none">아직 저장된 정보가 없어요. 사주를 보면 자동으로 기억해요.</p>
      ) : (
        <ul className="saved-list">
          {presets.map((x) => (
            <li key={presetMain(x) + presetSub(x)} className="saved-item">
              {/* 마이페이지에선 보기만 (사주 보기 버튼 없음) — 지우기만 가능 */}
              <div className="saved-load is-static">
                <span className="saved-text">
                  <b>{presetMain(x)}</b>
                  <span>{presetSub(x)}</span>
                </span>
              </div>
              <button type="button" className="saved-del" aria-label={`${presetMain(x)} 지우기`} onClick={() => setPresets(removePreset(x))}>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title my-title">계정</h2>
      <div className="my-actions">
        <button type="button" className="my-action" onClick={() => logout().then(() => navigate('/'))}>
          로그아웃
        </button>
        <button type="button" className="my-action is-danger" onClick={() => withdraw().then((ok) => ok && navigate('/'))}>
          회원 탈퇴
        </button>
      </div>
    </section>
  );
}
