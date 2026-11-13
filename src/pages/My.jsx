// 마이페이지 (/my): 상단 닉네임을 누르면 이동. 카드형(항목 이름 · 값 · 버튼 줄) —
// 내 프로필 · 기본 정보(이메일·비밀번호 변경·휴대폰 본인인증 자리(준비중)) · 내 사주 정보(계정에 저장) · 저장된 사주 정보(이 브라우저) · 로그아웃·탈퇴
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { LogoSymbol } from '../components/Logo.jsx';
import StepForm from '../components/StepForm.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { passwordOk } from '../lib/password.js';
import { loadPresets, removePreset, saveInput, saveTopic } from '../lib/storage.js';
import { seedLocal } from '../lib/history.js';
import { TOPICS } from '../lib/topics.js';
import { presetMain, presetSub, birthDateText, genderText, ageText } from '../lib/presetText.js';

// 마이페이지 탭 (주소 /my, /my/saju, /my/support). 세로로 길어지지 않게 기능별로 나눔 (2026-11-13)
const MY_TABS = [
  { id: 'account', label: '계정 정보', to: '/my' },
  { id: 'saju', label: '내 사주 정보', to: '/my/saju' },
  { id: 'history', label: '풀이 내역', to: '/my/history' },
  { id: 'support', label: '고객센터', to: '/my/support' },
];
const HISTORY_LABEL = (topic) => (topic === 'life' ? '평생 사주' : TOPICS.find((t) => t.id === topic)?.label || '사주 풀이');
const INQ_TYPES = { site: '이용 문의', error: '풀이·계산 오류 신고', ad: '제휴·광고 제안', etc: '기타' };
const fmtDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};

export default function My() {
  const navigate = useNavigate();
  const { auth, openLogin, openContact, inquiryVer, withdraw, setNick } = useOutletContext();
  const { hash } = useLocation();
  const params = useParams();
  // 예전 링크 /my#inquiries 는 고객센터 탭으로
  const tab = hash === '#inquiries' ? 'support' : MY_TABS.some((t) => t.id === params.tab) ? params.tab : 'account';

  // 풀이 내역 (서버 /api/history): 누르면 저장된 풀이를 그대로 다시 보여 줌 (새로 만들지 않음)
  const [hist, setHist] = useState(null);
  useEffect(() => {
    if (!auth.user || tab !== 'history') return;
    fetch('/api/history', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setHist(d?.items || []))
      .catch(() => setHist([]));
  }, [auth.user, tab]);
  const openHistory = async (it) => {
    const r = await fetch(`/api/history?key=${encodeURIComponent(it.key)}`, { cache: 'no-store' }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!d?.item) return;
    seedLocal(d.item);
    saveInput(d.item.input);
    if (d.item.topic === 'life') navigate('/result?v=life');
    else {
      saveTopic(d.item.topic);
      navigate('/result');
    }
  };
  const deleteHistory = async (it) => {
    if (!window.confirm('이 풀이 내역을 지울까요?')) return;
    const r = await fetch(`/api/history?key=${encodeURIComponent(it.key)}`, { method: 'DELETE' }).catch(() => null);
    if (r?.ok) setHist((h) => h.filter((x) => x.key !== it.key));
  };

  // 내 문의내역 (서버 /api/inquiry). 문의를 새로 보내면 inquiryVer 가 바뀌어 다시 읽음
  const [inqs, setInqs] = useState(null);
  const [openInq, setOpenInq] = useState(null);
  useEffect(() => {
    if (!auth.user) return;
    fetch('/api/inquiry', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInqs(d?.inquiries || []))
      .catch(() => setInqs([]));
  }, [auth.user, inquiryVer]);
  // 답변 알림 메일 링크(/my#inquiries)로 들어오면 문의내역으로 스크롤
  useEffect(() => {
    if (hash === '#inquiries' && inqs) document.getElementById('inquiries')?.scrollIntoView({ block: 'start' });
  }, [hash, inqs]);
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
  const [phoneMsg, setPhoneMsg] = useState('');
  const pwMsg = (f) => (pwErr.field === f ? pwErr.text : '');

  if (!auth.ready) return <section className="my" />;

  if (!auth.user) {
    return (
      <section className="my">
        <h1 className="start-title">마이페이지</h1>
        <div className="my-sec card my-empty">
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
      <div className="my-layout">
        {/* 왼쪽 탭 (휴대폰에선 위쪽 가로 탭). 메뉴가 늘면 MY_TABS 에 추가 */}
        <nav className="my-side" aria-label="마이페이지 메뉴">
          {MY_TABS.map((t) => (
            <Link key={t.id} to={t.to} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="my-main">
      {tab === 'account' && (
        <>
      {/* 내 프로필: 이미지(천동이) · 닉네임 */}
      <div className="my-sec card">
        <h2 className="my-sec-title">내 프로필</h2>
        <div className="my-row">
          <span className="my-row-label">이미지</span>
          <span className="my-row-value">
            <span className="my-avatar" aria-hidden="true">
              <LogoSymbol size={56} />
            </span>
          </span>
        </div>
        <div className="my-row">
          <span className="my-row-label">닉네임</span>
          {nickEdit ? (
            <form className="my-row-value my-nick-form" onSubmit={saveNick}>
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
            <>
              <b className="my-row-value">{auth.user.nick || '사주천문 회원'}</b>
              <button type="button" className="my-set" onClick={startNick}>
                변경
              </button>
            </>
          )}
        </div>
      </div>

      {/* 기본 정보: 가입 방법 · 이메일 · 비밀번호(이메일 회원만) */}
      <div className="my-sec card">
        <h2 className="my-sec-title">기본 정보</h2>
        {isEmail && (
          <div className="my-row">
            <span className="my-row-label">이메일</span>
            <span className="my-row-value my-break">{p.email || '-'}</span>
          </div>
        )}
        {isEmail && (
          <div className="my-row">
            <span className="my-row-label">비밀번호</span>
            <span className="my-row-value my-dots" aria-label="저장된 비밀번호">
              ●●●●●●●●
            </span>
            {!pwOpen && (
              <button type="button" className="my-set" onClick={openPw}>
                변경
              </button>
            )}
          </div>
        )}
        {isEmail && pwOpen && (
          <form className="my-pw" onSubmit={savePw} noValidate>
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
          <p className="my-msg" role="status">
            {pwDone}
          </p>
        )}
        {/* 휴대폰 본인인증: 가입 때는 필요 없고, 나중에 코인 결제 전에 받음. 인증 업체 연결 전이라 지금은 '준비중' */}
        <div className="my-row">
          <span className="my-row-label">휴대폰 번호</span>
          <span className={`my-row-value${p.phone ? '' : ' my-muted'}`}>{p.phone || '인증 전'}</span>
          <button type="button" className="my-set" onClick={() => setPhoneMsg('휴대폰 본인인증은 준비중이에요. 결제 기능과 함께 열릴 예정이에요.')}>
            {p.phone ? '변경' : '인증하기'}
          </button>
        </div>
        {phoneMsg && (
          <p className="my-msg" role="status">
            {phoneMsg}
          </p>
        )}
      </div>

      {/* 로그아웃은 상단 닉네임 메뉴로 옮김 */}
      <div className="my-foot">
        <button type="button" className="my-withdraw" onClick={() => withdraw().then((ok) => ok && navigate('/'))}>
          회원 탈퇴
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
        </>
      )}

      {tab === 'saju' && (
        <>
      {/* 내 사주 정보 (계정에 저장 — 다른 기기에서도 그대로) */}
      <div className="my-sec card">
        <div className="my-sec-head">
          <h2 className="my-sec-title">내 사주 정보</h2>
          {!editing &&
            (p.birth ? (
              <div className="my-sec-btns">
                <button type="button" className="my-set" onClick={() => setEditing(true)}>
                  수정
                </button>
                <button type="button" className="my-set" onClick={deleteBirth}>
                  삭제
                </button>
              </div>
            ) : (
              <button type="button" className="my-set" onClick={() => setEditing(true)}>
                등록
              </button>
            ))}
        </div>
        {editing ? (
          <p className="my-sec-note">아래에서 입력하고 저장해 주세요.</p>
        ) : p.birth ? (
          <>
            <div className="my-row my-row-tight">
              <span className="my-row-label">생년월일</span>
              <span className="my-row-value">
                {birthDateText(p.birth)} · {genderText(p.birth)}
                {ageText(p.birth) && <span className="my-age">({ageText(p.birth)})</span>}
              </span>
            </div>
            <div className="my-row my-row-tight">
              <span className="my-row-label">출생</span>
              <span className="my-row-value my-row-sub">{presetSub(p.birth)}</span>
            </div>
          </>
        ) : (
          <p className="my-sec-note">생년월일과 태어난 시각을 등록하면 다른 기기에서도 바로 내 사주를 볼 수 있어요.</p>
        )}
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
      </div>

      {/* 이 브라우저에만 기억한 사주 정보 */}
      <div className="my-sec card">
        <h2 className="my-sec-title">
          저장된 사주 정보 <small>이 브라우저에 최근 5명까지 기억해요</small>
        </h2>
        {presets.length === 0 ? (
          <p className="my-sec-note">아직 저장된 정보가 없어요. 사주를 보면 자동으로 기억해요.</p>
        ) : (
          <ul className="saved-list">
            {presets.map((x) => (
              <li key={presetMain(x) + presetSub(x)} className="saved-item">
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
      </div>
        </>
      )}

      {tab === 'history' && (
      <div className="my-sec card">
        <h2 className="my-sec-title">
          풀이 내역 <small>같은 정보로 다시 보면 천둥도사가 전에 펼친 풀이를 그대로 보여 드려요</small>
        </h2>
        {hist === null ? (
          <p className="my-sec-note">불러오는 중…</p>
        ) : hist.length === 0 ? (
          <p className="my-sec-note">아직 본 풀이가 없어요. 로그인한 채로 사주를 보면 여기에 쌓여요.</p>
        ) : (
          <ul className="saved-list">
            {hist.map((it) => (
              <li key={it.key} className="saved-item">
                <button type="button" className="saved-load" onClick={() => openHistory(it)}>
                  <span className="saved-text">
                    <b>
                      {HISTORY_LABEL(it.topic)} <span className="hist-person">{presetMain(it.input)}</span>
                    </b>
                    <span>
                      {presetSub(it.input)} · {fmtDate(it.updatedAt)}
                    </span>
                  </span>
                  <span className="saved-go">다시 보기</span>
                </button>
                <button type="button" className="saved-del" aria-label={`${HISTORY_LABEL(it.topic)} 내역 지우기`} onClick={() => deleteHistory(it)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}

      {tab === 'support' && (
      /* 고객센터 · 내 문의내역: 접수일 · 유형 · 답변 상태. 누르면 내용과 답변을 펼침 */
      <div className="my-sec card" id="inquiries">
        <div className="my-sec-head">
          <h2 className="my-sec-title">내 문의내역</h2>
          <button type="button" className="my-set" onClick={openContact}>
            문의하기
          </button>
        </div>
        {inqs === null ? (
          <p className="my-sec-note">불러오는 중…</p>
        ) : inqs.length === 0 ? (
          <p className="my-sec-note">아직 남긴 문의가 없어요.</p>
        ) : (
          <ul className="inq-list">
            {inqs.map((q) => {
              const on = openInq === q.id;
              return (
                <li key={q.id} className={`inq-item${on ? ' is-open' : ''}`}>
                  <button type="button" className="inq-head" aria-expanded={on} onClick={() => setOpenInq(on ? null : q.id)}>
                    <span className={`inq-badge${q.answer ? ' is-done' : ''}`}>{q.answer ? '답변 완료' : '답변 대기'}</span>
                    <span className="inq-title">{q.message}</span>
                    <span className="inq-meta">
                      {INQ_TYPES[q.type] || '문의'} · {fmtDate(q.createdAt)}
                    </span>
                  </button>
                  {on && (
                    <div className="inq-body">
                      {/* 상세 정보 표 */}
                      <dl className="inq-info">
                        <dt>유형</dt>
                        <dd>{INQ_TYPES[q.type] || '문의'}</dd>
                        <dt>접수일시</dt>
                        <dd>{fmtDateTime(q.createdAt)}</dd>
                        <dt>상태</dt>
                        <dd className={q.answer ? 'is-done' : ''}>{q.answer ? '답변 완료' : '답변 대기'}</dd>
                        <dt>답변일시</dt>
                        <dd>{q.answeredAt ? fmtDateTime(q.answeredAt) : '-'}</dd>
                      </dl>
                      <span className="inq-sub">문의 내용</span>
                      <p className="inq-msg">{q.message}</p>
                      {q.answer ? (
                        <div className="inq-answer">
                          <span className="inq-answer-label">운영자 답변 ·{fmtDate(q.answeredAt)}</span>
                          <p>{q.answer}</p>
                        </div>
                      ) : (
                        <p className="inq-wait">답변을 준비하고 있어요. 보통 영업일 기준 2~3일 안에 답변드려요.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      )}
        </div>
      </div>
    </section>
  );
}
