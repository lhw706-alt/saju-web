// 관리자: 카카오 로그인 회원 목록 (/admin). 비밀번호 = Netlify 환경 변수 ADMIN_PASSWORD.
// 비밀번호는 저장하지 않고 이 화면에 있는 동안만 메모리에 둠. 검색 노출 막음(Layout noindex, robots.txt).
import { useState } from 'react';

const INQ_TYPES = { site: '이용 문의', error: '풀이·계산 오류 신고', ad: '제휴·광고 제안', etc: '기타' };
const fmt = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function Admin() {
  const [pw, setPw] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/admin/users', { headers: { authorization: `Bearer ${pw}` }, cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setData(null);
        setError(d.error || '목록을 불러오지 못했어요.');
      } else setData(d);
    } catch {
      setError('네트워크 연결을 확인해 주세요.');
    }
    setLoading(false);
  };

  // 문의 탭: 답변 저장 (/api/admin/inquiry). 첫 답변이고 이메일을 적은 문의면 서버가 알림 메일도 보냄
  const [tab, setTab] = useState('users');
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState('');
  const [ansMsg, setAnsMsg] = useState({});
  const inqs = data?.inquiries || [];
  const waiting = inqs.filter((q) => !q.answer).length;
  const saveAnswer = async (q) => {
    const answer = (drafts[q.key] ?? q.answer ?? '').trim();
    setSaving(q.key);
    const r = await fetch('/api/admin/inquiry', {
      method: 'POST',
      headers: { authorization: `Bearer ${pw}`, 'content-type': 'application/json' },
      body: JSON.stringify({ key: q.key, answer }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setSaving('');
    if (!r?.ok) return setAnsMsg((m) => ({ ...m, [q.key]: d?.error || '저장하지 못했어요.' }));
    setData((old) => ({ ...old, inquiries: old.inquiries.map((x) => (x.key === q.key ? { ...x, answer, answeredAt: d.answeredAt } : x)) }));
    setAnsMsg((m) => ({ ...m, [q.key]: answer ? (d.mailed ? '저장했어요 · 알림 메일 보냄' : '저장했어요') : '답변을 지웠어요' }));
  };

  const today = new Date().toDateString();
  const todayCount = data?.users.filter((u) => new Date(u.lastLoginAt).toDateString() === today).length ?? 0;
  const newToday = data?.users.filter((u) => new Date(u.joinedAt).toDateString() === today).length ?? 0;

  return (
    <section className="admin">
      <h1 className="start-title">관리자</h1>
      {!data ? (
        <form className="admin-login card" onSubmit={load}>
          <label className="contact-label" htmlFor="admin-pw">
            관리자 비밀번호
          </label>
          <input id="admin-pw" className="contact-input" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          {error && <p className="field-msg">{error}</p>}
          <button type="submit" className="btn-primary" disabled={!pw || loading}>
            {loading ? '불러오는 중…' : '보기'}
          </button>
        </form>
      ) : (
        <>
          <ul className="admin-stats">
            <li>
              <span>전체 회원</span>
              <b>{data.total}명</b>
            </li>
            <li>
              <span>카카오 · 이메일</span>
              <b>
                {data.users.filter((u) => u.provider !== 'email').length} · {data.users.filter((u) => u.provider === 'email').length}
              </b>
            </li>
            <li>
              <span>오늘 로그인</span>
              <b>{todayCount}명</b>
            </li>
            <li>
              <span>오늘 가입</span>
              <b>{newToday}명</b>
            </li>
          </ul>
          <div className="admin-actions">
            <button type="button" className="btn-ghost" onClick={load} disabled={loading}>
              {loading ? '불러오는 중…' : '새로고침'}
            </button>
          </div>
          <div className="admin-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'users'} className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}>
              회원 {data.total}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'inquiries'} className={tab === 'inquiries' ? 'on' : ''} onClick={() => setTab('inquiries')}>
              문의 {inqs.length}
              {waiting > 0 && <span className="admin-dot">답변 대기 {waiting}</span>}
            </button>
          </div>
          {tab === 'inquiries' ? (
            inqs.length === 0 ? (
              <p className="hint">아직 들어온 문의가 없어요.</p>
            ) : (
              <ul className="inq-list admin-inq">
                {inqs.map((q) => (
                  <li key={q.key} className="inq-item">
                    <div className="admin-inq-head">
                      <span className={`inq-badge${q.answer ? ' is-done' : ''}`}>{q.answer ? '답변 완료' : '답변 대기'}</span>
                      <b>{q.nick || '-'}</b>
                      <span className="inq-meta">
                        {INQ_TYPES[q.type] || q.type}
                        {q.company ? ` · ${q.company}` : ''} · {fmt(q.createdAt)}
                        {q.email ? ` · ${q.email}` : ''}
                      </span>
                    </div>
                    <p className="inq-msg">{q.message}</p>
                    {q.page && <span className="inq-meta">보낸 화면: {q.page}</span>}
                    <label className="contact-label" htmlFor={`ans-${q.id}`}>
                      답변 {q.answeredAt && <span className="inq-meta">· {fmt(q.answeredAt)} 저장</span>}
                    </label>
                    <textarea
                      id={`ans-${q.id}`}
                      className="contact-input contact-textarea"
                      rows={4}
                      maxLength={4000}
                      value={drafts[q.key] ?? q.answer ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [q.key]: e.target.value }))}
                      placeholder="답변을 적으면 회원의 마이페이지 내 문의내역에 보여요."
                    />
                    <div className="admin-inq-actions">
                      {ansMsg[q.key] && <span className="inq-meta">{ansMsg[q.key]}</span>}
                      <button type="button" className="btn-primary inline" disabled={saving === q.key} onClick={() => saveAnswer(q)}>
                        {saving === q.key ? '저장 중…' : '답변 저장'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : data.users.length === 0 ? (
            <p className="hint">아직 로그인한 회원이 없어요.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>닉네임</th>
                    <th>가입 방법</th>
                    <th>카카오 이름 / 이메일</th>
                    <th>회원번호</th>
                    <th>가입</th>
                    <th>마지막 로그인</th>
                    <th>로그인 횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td className="num">{u.no}</td>
                      <td>{u.displayNick || '-'}</td>
                      <td>{u.provider === 'email' ? '이메일' : '카카오'}</td>
                      <td>{(u.provider === 'email' ? u.email : u.nick) || '-'}</td>
                      <td className="mono">{u.id}</td>
                      <td>{fmt(u.joinedAt)}</td>
                      <td>{fmt(u.lastLoginAt)}</td>
                      <td className="num">{u.loginCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
