// 마이페이지 '운세 일기' 탭 (/my/diary, 2026-11-19 사용자 지시 — 리텐션 기능 ③). 서버 /api/diary (회원, 오늘·어제만 쓰기).
// 오늘 하루(1~5)·운세가 맞았는지·한 줄(100자) → 달력에 점 · 기록 목록 · '내 일진 패턴'(그날 일진 천간의 오행별 평균, 5개 이상 쌓이면).
// 'AI 티' 없이 — 상자 버튼 대신 얇은 줄·글자 선택, 색은 기분 점에만.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ELEMENT_KO, ganzhiKo } from '../lib/saju.js';
import { STEM_INFO } from '../lib/iljoo.js';
import { trackEvent } from '../lib/analytics.js';

const MOODS = ['', '힘들었어요', '별로였어요', '보통이었어요', '좋았어요', '아주 좋았어요'];
const HITS = ['안 봤어요', '안 맞았어요', '조금 맞았어요', '잘 맞았어요'];
const EL_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
const p2 = (n) => String(n).padStart(2, '0');
const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const shiftMonth = (ym, d) => {
  const [y, m] = ym.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${t.getUTCFullYear()}-${p2(t.getUTCMonth() + 1)}`;
};

export default function DiaryBoard() {
  const today = kst();
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86400e3).toISOString().slice(0, 10);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [data, setData] = useState(null);
  const [all, setAll] = useState([]);
  const [date, setDate] = useState(today);
  const [form, setForm] = useState({ mood: 0, hit: 0, memo: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = (m = month, withAll = false) =>
    fetch(`/api/diary?month=${m}${withAll ? '&all=1' : ''}`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || '불러오지 못했어요.');
        setData(d);
        if (withAll) setAll(d.all || []);
      })
      .catch((e) => setData({ error: e.message, entries: [] }));
  useEffect(() => {
    load(month, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (data && data.month !== month) load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const byDate = useMemo(() => Object.fromEntries((data?.entries || []).map((e) => [e.date, e])), [data]);
  // 쓰는 날짜를 바꾸면 이미 쓴 내용을 불러옴 (어제 기록은 이번 달이 아닐 수도 있어 all 에서도 찾음)
  useEffect(() => {
    const e = byDate[date] || all.find((x) => x.date === date);
    setForm(e ? { mood: e.mood, hit: e.hit ?? 0, memo: e.memo || '' } : { mood: 0, hit: 0, memo: '' });
    setMsg('');
  }, [date, byDate, all]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.mood) return setMsg('오늘 하루가 어땠는지 골라 주세요.');
    setBusy(true);
    const r = await fetch('/api/diary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date, ...form }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r?.ok) return setMsg(d?.error || '저장하지 못했어요.');
    trackEvent('diary_save', { mood: form.mood });
    if (d.grow) window.dispatchEvent(new CustomEvent('saju:grow', { detail: d.grow }));
    setMsg(d.grow?.gained ? `저장했어요. 천동이가 기운 ${d.grow.gained}을 받았어요.` : '저장했어요.');
    setMonth(date.slice(0, 7));
    load(date.slice(0, 7), true);
  };

  // 내 일진 패턴: 그날 일진 천간의 오행별 평균 기분
  const pattern = useMemo(() => {
    const acc = {};
    for (const e of all) {
      const el = STEM_INFO[e.ganzhi?.[0]]?.el;
      if (!el) continue;
      (acc[el] ||= []).push(e.mood);
    }
    return EL_ORDER.map((el) => ({ el, n: acc[el]?.length || 0, avg: acc[el]?.length ? acc[el].reduce((a, b) => a + b, 0) / acc[el].length : 0 }));
  }, [all]);
  const best = [...pattern].filter((x) => x.n >= 2).sort((a, b) => b.avg - a.avg)[0];

  if (!data) return <p className="hint">불러오는 중…</p>;
  if (data.error) return <p className="rec-empty">{data.error}</p>;

  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${p2(i + 1)}`)];
  const writing = byDate[date] || all.find((x) => x.date === date);

  return (
    <section className="diary" aria-labelledby="diary-title">
      <h2 id="diary-title" className="mw-title">
        운세 일기
      </h2>
      <p className="diary-lead">
        아침엔 <Link to="/#fortune">오늘의 운세</Link>를 보고, 저녁엔 하루를 한 줄로 남겨요. 쌓이면 나에게 잘 맞는 일진이 보여요.
      </p>

      <form className="diary-form" onSubmit={save}>
        <div className="diary-days" role="radiogroup" aria-label="쓰는 날">
          {[
            [today, '오늘'],
            [yesterday, '어제'],
          ].map(([d, t]) => (
            <button key={d} type="button" role="radio" aria-checked={date === d} className={date === d ? 'on' : ''} onClick={() => setDate(d)}>
              {t} <small>{Number(d.slice(5, 7))}.{Number(d.slice(8))}</small>
            </button>
          ))}
        </div>
        <p className="diary-q">하루가 어땠나요?</p>
        <div className="diary-moods" role="radiogroup" aria-label="오늘 하루">
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} type="button" role="radio" aria-checked={form.mood === v} className={`m${v}${form.mood === v ? ' on' : ''}`} onClick={() => setForm((f) => ({ ...f, mood: v }))}>
              <span className="diary-dot" aria-hidden="true" />
              {MOODS[v]}
            </button>
          ))}
        </div>
        <p className="diary-q">운세는 맞았나요?</p>
        <div className="diary-hits" role="radiogroup" aria-label="운세가 맞았는지">
          {HITS.map((t, v) => (
            <button key={t} type="button" role="radio" aria-checked={form.hit === v} className={form.hit === v ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, hit: v }))}>
              {t}
            </button>
          ))}
        </div>
        <label className="diary-q" htmlFor="diary-memo">
          한 줄 기록 <small>{form.memo.length}/100</small>
        </label>
        <input id="diary-memo" className="contact-input" maxLength={100} placeholder="오늘 기억하고 싶은 한 가지" value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} />
        {msg && (
          <p className="diary-msg" role="status">
            {msg}
          </p>
        )}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? '저장 중…' : writing ? '고쳐서 저장하기' : '저장하기'}
        </button>
      </form>

      <div className="diary-cal-head">
        <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="지난달">
          ‹
        </button>
        <b>
          {y}년 {m}월
        </b>
        <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= today.slice(0, 7)} aria-label="다음 달">
          ›
        </button>
      </div>
      <div className="diary-cal" role="grid" aria-label={`${y}년 ${m}월 기록`}>
        {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
          <span key={w} className="diary-wd">
            {w}
          </span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <span key={d} className={`diary-cell${d === today ? ' is-today' : ''}`} role="gridcell" title={byDate[d] ? MOODS[byDate[d].mood] : ''}>
              {Number(d.slice(8))}
              {byDate[d] && <i className={`diary-dot m${byDate[d].mood}`} />}
            </span>
          ) : (
            <span key={`e${i}`} />
          ),
        )}
      </div>

      {(data.entries || []).length > 0 && (
        <ul className="diary-list">
          {data.entries.map((e) => (
            <li key={e.date}>
              <span className="diary-list-date">
                {Number(e.date.slice(5, 7))}.{Number(e.date.slice(8))} <small>{ganzhiKo(e.ganzhi)}일</small>
              </span>
              <span className="diary-list-body">
                <i className={`diary-dot m${e.mood}`} aria-hidden="true" />
                {MOODS[e.mood]}
                {e.hit ? ` · 운세 ${HITS[e.hit]}` : ''}
                {e.memo && <small>{e.memo}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="grow-h3">내 일진 패턴</h3>
      {all.length < 5 ? (
        <p className="diary-lead">일기가 5개 이상 쌓이면, 그날 일진의 기운(오행)에 따라 내 하루가 어땠는지 보여 드려요. 지금 {all.length}개예요.</p>
      ) : (
        <>
          <ul className="diary-pattern">
            {pattern.map((p) => (
              <li key={p.el} className={`el-${p.el}`}>
                <span>{ELEMENT_KO[p.el]} 기운 날</span>
                <span className="diary-pbar" aria-hidden="true">
                  <span style={{ width: `${(p.avg / 5) * 100}%` }} />
                </span>
                <span className="diary-pval">{p.n ? p.avg.toFixed(1) : '-'}</span>
              </li>
            ))}
          </ul>
          {best && <p className="diary-lead">{ELEMENT_KO[best.el]} 기운이 도는 날에 하루가 가장 좋았어요. 그런 날엔 미뤄 둔 일을 해 보세요.</p>}
        </>
      )}
      <p className="grow-note">일기는 회원 계정에만 저장되고, 회원 탈퇴하면 모두 지워져요.</p>
    </section>
  );
}
