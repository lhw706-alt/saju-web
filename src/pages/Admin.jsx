// 관리자: 카카오 로그인 회원 목록 (/admin). 비밀번호 = Netlify 환경 변수 ADMIN_PASSWORD.
// 비밀번호는 저장하지 않고 이 화면에 있는 동안만 메모리에 둠. 검색 노출 막음(Layout noindex, robots.txt).
import { useState } from 'react';

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

  const today = new Date().toDateString();
  const todayCount = data?.users.filter((u) => new Date(u.lastLoginAt).toDateString() === today).length ?? 0;
  const newToday = data?.users.filter((u) => new Date(u.joinedAt).toDateString() === today).length ?? 0;

  return (
    <section className="admin">
      <h1 className="start-title">회원 목록</h1>
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
          {data.users.length === 0 ? (
            <p className="hint">아직 로그인한 회원이 없어요.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>닉네임</th>
                    <th>카카오 이름</th>
                    <th>카카오 회원번호</th>
                    <th>가입</th>
                    <th>마지막 로그인</th>
                    <th>로그인 횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.displayNick || '-'}</td>
                      <td>{u.nick || '-'}</td>
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
