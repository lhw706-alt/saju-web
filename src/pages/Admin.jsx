// 관리자: 카카오 로그인 회원 목록 (/admin). 비밀번호 = Netlify 환경 변수 ADMIN_PASSWORD.
// 비밀번호는 저장하지 않고 이 화면에 있는 동안만 메모리에 둠. 검색 노출 막음(Layout noindex, robots.txt).
import { useState } from 'react';
import { askConfirm, showAlert } from '../components/ConfirmHost.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import AdminWallet from '../components/AdminWallet.jsx';

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

  // 디자인 시스템 문서 (2026-11-17): 비밀번호 확인 뒤 서버가 준 HTML 을 새 탭(blob 주소)으로 엶. 팝업 차단을 피하려고 탭은 누르자마자 먼저 엶
  const [dsLoading, setDsLoading] = useState(false);
  const openDesignSystem = async () => {
    const win = window.open('', '_blank');
    setDsLoading(true);
    try {
      const r = await fetch('/api/admin/ds', { method: 'POST', headers: { authorization: `Bearer ${pw}` }, cache: 'no-store' });
      if (!r.ok) {
        win?.close();
        const d = await r.json().catch(() => ({}));
        setError(d.error || '디자인 시스템을 열지 못했어요.');
      } else {
        const url = URL.createObjectURL(new Blob([await r.text()], { type: 'text/html' }));
        if (win) win.location.href = url;
        else window.location.href = url;
      }
    } catch {
      win?.close();
      setError('네트워크 연결을 확인해 주세요.');
    }
    setDsLoading(false);
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

  // 행운의 번호 탭: 오늘 뽑은 회원 목록 + 초기화(다시 뽑을 수 있게) — /api/admin/lucky
  const lucky = data?.lucky || [];
  const [luckyMsg, setLuckyMsg] = useState('');
  const resetLucky = async (x) => {
    if (!await askConfirm(`${x.nick} 님의 오늘 행운의 번호를 지울까요? 지우면 오늘 다시 뽑을 수 있어요.`)) return;
    const r = await fetch('/api/admin/lucky', {
      method: 'POST',
      headers: { authorization: `Bearer ${pw}`, 'content-type': 'application/json' },
      body: JSON.stringify({ userId: x.userId }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) return setLuckyMsg(d?.error || '초기화하지 못했어요.');
    setData((old) => ({ ...old, lucky: old.lucky.filter((y) => y.userId !== x.userId) }));
    setLuckyMsg(`${x.nick} 님의 오늘 번호를 지웠어요. 다시 뽑을 수 있어요.`);
  };

  // 금전 탭 (2026-11-15 사용자 지시): 회원에게 금전 넣어 주기 — /api/admin/credit
  const [giveQ, setGiveQ] = useState('');
  const [giveAmt, setGiveAmt] = useState({});
  const [giveMemo, setGiveMemo] = useState({});
  const [giveMsg, setGiveMsg] = useState('');
  const [giving, setGiving] = useState(null);
  const [openW, setOpenW] = useState(null); // 내역·환불을 펼친 회원
  const give = async (u) => {
    const amount = Number(giveAmt[u.id] || 0);
    if (!Number.isInteger(amount) || amount < 1) return setGiveMsg('넣을 금전을 1 이상 숫자로 적어 주세요.');
    const name = u.displayNick || u.nick || u.id;
    if (!await askConfirm(`${name} 님에게 ${amount.toLocaleString('ko-KR')}금전을 넣을까요?`)) return;
    setGiving(u.id);
    const r = await fetch('/api/admin/credit', {
      method: 'POST',
      headers: { authorization: `Bearer ${pw}`, 'content-type': 'application/json' },
      body: JSON.stringify({ userId: u.id, amount, memo: giveMemo[u.id] || '' }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setGiving(null);
    if (!r?.ok) return setGiveMsg(d?.error || '넣지 못했어요.');
    setData((old) => ({ ...old, users: old.users.map((x) => (x.id === u.id ? { ...x, balance: d.balance } : x)) }));
    setGiveAmt((m) => ({ ...m, [u.id]: '' }));
    setGiveMemo((m) => ({ ...m, [u.id]: '' }));
    setGiveMsg(`${name} 님에게 ${amount.toLocaleString('ko-KR')}금전을 넣었어요. 지금 ${d.balance.toLocaleString('ko-KR')}금전.`);
  };

  // 테스트 계정 탭 (2026-11-17 사용자 지시): 메일 인증 없이 시험용 이메일 회원 만들기 — /api/admin/test-account
  const [ta, setTa] = useState({ email: '', password: '', nick: '', coins: '' });
  const [taMsg, setTaMsg] = useState('');
  const [taBusy, setTaBusy] = useState(false);
  const makeTest = async (e) => {
    e.preventDefault();
    setTaBusy(true);
    setTaMsg('');
    const r = await fetch('/api/admin/test-account', {
      method: 'POST',
      headers: { authorization: `Bearer ${pw}`, 'content-type': 'application/json' },
      body: JSON.stringify(ta),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setTaBusy(false);
    if (!r?.ok) return setTaMsg(d?.error || '만들지 못했어요.');
    setData((old) => ({ ...old, total: old.total + 1, users: [{ ...d.user, no: old.total + 1 }, ...old.users] }));
    setTaMsg(`만들었어요. 아이디 ${d.user.email} · 닉네임 ${d.user.displayNick}${d.user.balance ? ` · ${d.user.balance.toLocaleString('ko-KR')}금전` : ''}`);
    setTa({ email: '', password: '', nick: '', coins: '' });
  };
  const tests = data?.users.filter((u) => u.test) ?? [];

  const today = new Date().toDateString();
  const todayCount = data?.users.filter((u) => new Date(u.lastLoginAt).toDateString() === today).length ?? 0;
  const newToday = data?.users.filter((u) => new Date(u.joinedAt).toDateString() === today).length ?? 0;

  return (
    <section className="admin">
      <h1 className="start-title">관리자</h1>
      {!data ? (
        <form className="admin-login card" onSubmit={load}>
          <PasswordInput id="admin-pw" label="관리자 비밀번호" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
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
            <button type="button" className="btn-ghost" onClick={openDesignSystem} disabled={dsLoading}>
              {dsLoading ? '여는 중…' : '디자인 시스템 ↗'}
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
            <button type="button" role="tab" aria-selected={tab === 'lucky'} className={tab === 'lucky' ? 'on' : ''} onClick={() => setTab('lucky')}>
              행운의 번호 {lucky.length}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'credit'} className={tab === 'credit' ? 'on' : ''} onClick={() => setTab('credit')}>
              금전
            </button>
            <button type="button" role="tab" aria-selected={tab === 'test'} className={tab === 'test' ? 'on' : ''} onClick={() => setTab('test')}>
              테스트 계정 {tests.length}
            </button>
          </div>
          {tab === 'test' ? (
            <div className="admin-test">
              <p className="hint">PG·앱 심사 담당자에게 줄 시험용 계정을 메일 인증 없이 만들어요. 로그인 창의 이메일 로그인으로 들어가요. 지울 때는 그 계정으로 로그인해 마이페이지에서 회원 탈퇴를 눌러 주세요.</p>
              <form className="admin-test-form" onSubmit={makeTest}>
                <label className="contact-label" htmlFor="ta-email">아이디 (이메일 모양)</label>
                <input id="ta-email" className="contact-input" autoComplete="off" placeholder="review1@sajucheonmun.com" value={ta.email} onChange={(e) => setTa((t) => ({ ...t, email: e.target.value }))} />
                <PasswordInput id="ta-pw" label="비밀번호" autoComplete="new-password" value={ta.password} onChange={(e) => setTa((t) => ({ ...t, password: e.target.value }))} />
                <label className="contact-label" htmlFor="ta-nick">닉네임 (선택, 비우면 랜덤)</label>
                <input id="ta-nick" className="contact-input" maxLength={12} value={ta.nick} onChange={(e) => setTa((t) => ({ ...t, nick: e.target.value }))} />
                <label className="contact-label" htmlFor="ta-coins">처음 넣어 줄 금전 (선택)</label>
                <input id="ta-coins" className="contact-input" inputMode="numeric" placeholder="0" value={ta.coins} onChange={(e) => setTa((t) => ({ ...t, coins: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) }))} />
                {taMsg && <p className="inq-meta" role="status">{taMsg}</p>}
                <button type="submit" className="btn-primary" disabled={taBusy || !ta.email || !ta.password}>
                  {taBusy ? '만드는 중…' : '테스트 계정 만들기'}
                </button>
              </form>
              {tests.length > 0 && (
                <ul className="admin-credit-list">
                  {tests.map((u) => (
                    <li key={u.id}>
                      <span className="admin-credit-who">
                        <b>{u.displayNick || '-'}</b>
                        <small>{u.email}</small>
                      </span>
                      <span className="admin-credit-bal">{(u.balance || 0).toLocaleString('ko-KR')}금전</span>
                      <span className="inq-meta">{fmt(u.joinedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : tab === 'credit' ? (
            <div className="admin-credit">
              <p className="hint">회원에게 금전을 넣어 줄 수 있어요. 넣은 금전은 회원의 복채 내역에 '운영자 지급'으로 남고, 결제가 아니라 환불 대상이 아니에요. '내역·환불'을 누르면 충전별 환불 금액 계산·환불 처리·금전 빼기를 할 수 있어요.</p>
              <input className="contact-input admin-credit-search" placeholder="닉네임·이메일·회원번호로 찾기" value={giveQ} onChange={(e) => setGiveQ(e.target.value)} aria-label="회원 찾기" />
              {giveMsg && <p className="inq-meta" role="status">{giveMsg}</p>}
              <ul className="admin-credit-list">
                {data.users
                  .filter((u) => !giveQ.trim() || [u.displayNick, u.nick, u.email, u.id].join(' ').toLowerCase().includes(giveQ.trim().toLowerCase()))
                  .slice(0, 100)
                  .map((u) => (
                    <li key={u.id}>
                      <span className="admin-credit-who">
                        <b>{u.displayNick || '-'}</b>
                        <small>{(u.provider === 'email' ? u.email : u.nick) || u.id}</small>
                      </span>
                      <span className="admin-credit-bal">{(u.balance || 0).toLocaleString('ko-KR')}금전</span>
                      <input className="contact-input" inputMode="numeric" placeholder="금전" value={giveAmt[u.id] || ''} onChange={(e) => setGiveAmt((m) => ({ ...m, [u.id]: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) }))} aria-label={`${u.displayNick || u.id} 에게 넣을 금전`} />
                      <input className="contact-input" placeholder="메모(선택)" maxLength={30} value={giveMemo[u.id] || ''} onChange={(e) => setGiveMemo((m) => ({ ...m, [u.id]: e.target.value }))} aria-label="메모" />
                      <button type="button" className="btn-primary inline" disabled={giving === u.id} onClick={() => give(u)}>
                        {giving === u.id ? '넣는 중…' : '넣기'}
                      </button>
                      <button type="button" className="btn-ghost inline admin-w-toggle" aria-expanded={openW === u.id} onClick={() => setOpenW((v) => (v === u.id ? null : u.id))}>
                        {openW === u.id ? '닫기' : '내역·환불'}
                      </button>
                      {openW === u.id && (
                        <div className="admin-w-panel">
                          <AdminWallet userId={u.id} name={u.displayNick || u.id} pw={pw} onBalance={(b) => setData((old) => ({ ...old, users: old.users.map((x) => (x.id === u.id ? { ...x, balance: b } : x)) }))} />
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          ) : tab === 'lucky' ? (
            <div className="admin-lucky">
              <p className="hint">{data.luckyDate} (한국 시각) 오늘 뽑은 회원이에요. 초기화하면 그 회원은 오늘 다시 뽑을 수 있어요.</p>
              {luckyMsg && <p className="inq-meta" role="status">{luckyMsg}</p>}
              {lucky.length === 0 ? (
                <p className="hint">오늘은 아직 뽑은 회원이 없어요.</p>
              ) : (
                <ul className="admin-lucky-list">
                  {lucky.map((x) => (
                    <li key={x.userId}>
                      <b>{x.nick}</b>
                      <span className="admin-lucky-nums">{(x.numbers || []).join(' · ')}</span>
                      <span className="inq-meta">{fmt(x.createdAt)}</span>
                      <button type="button" className="btn-ghost" onClick={() => resetLucky(x)}>
                        초기화
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : tab === 'inquiries' ? (
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
                      <td>{u.provider === 'email' ? '이메일' : '카카오'}{u.test ? ' · 테스트' : ''}</td>
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
