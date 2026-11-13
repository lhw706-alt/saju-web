// 마이페이지 (/my): 상단 닉네임을 누르면 이동. 내 정보 · 내 사주 정보(계정에 저장) · 저장된 사주 정보(이 브라우저) · 계정
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { CITIES } from '../lib/saju.js';
import { LogoSymbol } from '../components/Logo.jsx';
import StepForm from '../components/StepForm.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { passwordOk } from '../lib/password.js';
import { loadPresets, removePreset } from '../lib/storage.js';

const presetMain = (p) => `${p.year}.${p.month}.${p.day} · ${p.gender === 'male' ? '남성' : '여성'}`;
const presetSub = (p) => {
  const city = CITIES.find((c) => c.id === p.city)?.name || '';
  const time = p.timeKnown ? `${String(p.hour).padStart(2, '0')}:${String(p.minute || 0).padStart(2, '0')}` : '시각 모름';
  return [p.calendar === 'lunar' ? `음력${p.leap ? '(윤달)' : ''}` : '양력', time, city].join(' · ');
};

export default function My() {
  const navigate = useNavigate();
  const { auth, openLogin, logout, withdraw, setNick } = useOutletContext();
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


  // 사이트 닉네임 변경 (중복 허용, 2~12자) → 계정에 저장, 상단에도 바로 반영
  const [nickEdit, setNickEdit] = useState(false);
  const [nickDraft, setNickDraft] = useState('');
  const [nickErr, setNickErr] = useState('');
  const [nickSaving, setNickSaving] = useState(false);
  const [nickSuggest, setNickSuggest] = useState('천둥의 별빛 7'); // 입력칸에 회색으로 보이는 랜덤 닉네임 (비우고 저장하면 이 이름)
  const startNick = () => {
    setNickDraft('');
    setNickErr('');
    setNickEdit(true);
    fetch('/api/auth/nickname/suggest', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.nick && setNickSuggest(d.nick))
      .catch(() => {});
  };
  const saveNick = async (e) => {
    e.preventDefault();
    setNickSaving(true);
    setNickErr('');
    const r = await fetch('/api/auth/nickname', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nick: nickDraft.trim() || nickSuggest }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setNickSaving(false);
    if (!r?.ok) return setNickErr(d?.error || '바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    setNick(d.nick);
    setNickEdit(false);
  };

  // 비밀번호 변경 (이메일 회원만): 지금 비밀번호 확인 → 새 비밀번호(규칙은 src/lib/password.js) → 서버 /api/auth/email/password
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCur, setPwCur] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwNew2, setPwNew2] = useState('');
  const [pwErr, setPwErr] = useState({ field: '', text: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwDone, setPwDone] = useState('');
  const openPw = () => {
    setPwCur('');
    setPwNew('');
    setPwNew2('');
    setPwErr({ field: '', text: '' });
    setPwDone('');
    setPwOpen(true);
  };
  const savePw = async (e) => {
    e.preventDefault();
    if (!pwCur) return setPwErr({ field: 'current', text: '지금 비밀번호를 입력해 주세요.' });
    if (!passwordOk(pwNew)) return setPwErr({ field: 'password', text: '비밀번호 조건을 모두 맞춰 주세요.' });
    if (pwNew === pwCur) return setPwErr({ field: 'password', text: '지금 비밀번호와 다른 비밀번호를 정해 주세요.' });
    if (pwNew !== pwNew2) return setPwErr({ field: 'password2', text: '비밀번호가 서로 달라요.' });
    setPwBusy(true);
    setPwErr({ field: '', text: '' });
    const r = await fetch('/api/auth/email/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ current: pwCur, password: pwNew }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setPwBusy(false);
    if (!r?.ok) return setPwErr({ field: d?.field || '', text: d?.error || '바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.' });
    setPwOpen(false);
    setPwDone('비밀번호를 바꿨어요.');
  };
  const pwMsg = (f) => (pwErr.field === f ? pwErr.text : '');

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
  const isEmail = (profile?.provider || auth.user.provider) === 'email';
  return (
    <section className="my">
      <h1 className="start-title">마이페이지</h1>

      <div className="my-card card">
        <div className="my-hello">
          {/* 기본 프로필 사진: 천둥도사(천동이) */}
          <span className="my-avatar" aria-hidden="true">
            <LogoSymbol size={44} />
          </span>
          {nickEdit ? (
            <form className="my-nick-form" onSubmit={saveNick}>
              <label className="visually-hidden" htmlFor="my-nick">
                닉네임
              </label>
              <input
                id="my-nick"
                className="contact-input"
                value={nickDraft}
                maxLength={12}
                autoFocus
                onChange={(e) => setNickDraft(e.target.value)}
                placeholder={nickSuggest}
                aria-invalid={!!nickErr}
                aria-describedby={nickErr ? 'my-nick-err' : undefined}
              />
              <div className="my-nick-actions">
                <button type="submit" className="btn-primary inline" disabled={nickSaving}>
                  {nickSaving ? '저장 중…' : '저장'}
                </button>
                <button type="button" className="my-link" onClick={() => setNickEdit(false)}>
                  취소
                </button>
              </div>
              {nickErr && (
                <p id="my-nick-err" className="field-msg">
                  {nickErr}
                </p>
              )}
            </form>
          ) : (
            <div>
              <b>
                {auth.user.nick || '사주천문 회원'}님
                <button type="button" className="my-link my-nick-edit" onClick={startNick}>
                  변경
                </button>
              </b>
              <span>{isEmail ? '이메일로 로그인했어요' : '카카오로 로그인했어요'}</span>
            </div>
          )}
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
      {isEmail && pwOpen && (
        <form className="my-pw card" onSubmit={savePw} noValidate>
          <PasswordInput id="my-pw-cur" label="지금 비밀번호" value={pwCur} onChange={(e) => setPwCur(e.target.value)} error={pwMsg('current')} placeholder="지금 비밀번호 입력" autoComplete="current-password" />
          <PasswordInput id="my-pw-new" label="새 비밀번호" rules value={pwNew} onChange={(e) => setPwNew(e.target.value)} error={pwMsg('password')} placeholder="새 비밀번호 입력" />
          <PasswordInput
            id="my-pw-new2"
            label="새 비밀번호 확인"
            value={pwNew2}
            onChange={(e) => setPwNew2(e.target.value)}
            error={pwMsg('password2') || (pwNew2 && pwNew !== pwNew2 ? '비밀번호가 서로 달라요.' : '')}
            placeholder="한 번 더 입력"
            okText={pwNew2 && pwNew === pwNew2 && passwordOk(pwNew) ? '비밀번호가 같아요.' : ''}
          />
          {pwErr.text && !['current', 'password', 'password2'].includes(pwErr.field) && <p className="field-msg">{pwErr.text}</p>}
          <div className="my-pw-actions">
            <button type="submit" className="btn-primary inline" disabled={pwBusy}>
              {pwBusy ? '저장 중…' : '비밀번호 바꾸기'}
            </button>
            <button type="button" className="my-link" onClick={() => setPwOpen(false)}>
              취소
            </button>
          </div>
        </form>
      )}
      {pwDone && (
        <p className="my-msg my-pw-done" role="status">
          {pwDone}
        </p>
      )}
      <div className="my-actions">
        {isEmail && !pwOpen && (
          <button type="button" className="my-action" onClick={openPw}>
            비밀번호 변경
          </button>
        )}
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
