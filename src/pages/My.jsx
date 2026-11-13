// 마이페이지 (/my): 상단 닉네임을 누르면 이동. 내 정보 · 저장된 사주 정보 · 계정(로그아웃·회원 탈퇴)
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { CITIES } from '../lib/saju.js';
import { loadPresets, removePreset, saveInput, markFresh, clearTopic } from '../lib/storage.js';

const fmt = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
};
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

  useEffect(() => {
    if (!auth.user) return;
    fetch('/api/auth/me?full=1', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProfile(d?.user || null))
      .catch(() => {});
  }, [auth.user]);

  // 저장된 정보로 바로 평생 사주 보기
  const view = (p) => {
    clearTopic();
    saveInput(p);
    markFresh();
    navigate('/result');
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
          <span className="my-avatar" aria-hidden="true">
            {(p.nick || '나').slice(0, 1)}
          </span>
          <div>
            <b>{p.nick || '사주천문 회원'}님</b>
            <span>카카오로 로그인했어요</span>
          </div>
        </div>
        <dl className="my-info">
          <div>
            <dt>가입한 날</dt>
            <dd>{fmt(p.joinedAt)}</dd>
          </div>
          <div>
            <dt>마지막 로그인</dt>
            <dd>{fmt(p.lastLoginAt)}</dd>
          </div>
          <div>
            <dt>방문 횟수</dt>
            <dd>{p.loginCount ? `${p.loginCount}번` : '-'}</dd>
          </div>
        </dl>
      </div>

      <h2 className="section-title my-title">
        저장된 사주 정보 <small>이 브라우저에 최근 5명까지 기억해요</small>
      </h2>
      {presets.length === 0 ? (
        <p className="my-none">아직 저장된 정보가 없어요. 사주를 보면 자동으로 기억해요.</p>
      ) : (
        <ul className="saved-list">
          {presets.map((x) => (
            <li key={presetMain(x) + presetSub(x)} className="saved-item">
              <button type="button" className="saved-load" onClick={() => view(x)}>
                <span className="saved-text">
                  <b>{presetMain(x)}</b>
                  <span>{presetSub(x)}</span>
                </span>
                <span className="saved-go">사주 보기</span>
              </button>
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
