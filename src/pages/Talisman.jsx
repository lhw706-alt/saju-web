// 행운의 부적 (/talisman, 2026-11-14 사용자 기획안) — 원하는 행운을 고르면 그에 맞는 부적을 펼쳐 보여 주는 소장형 콘텐츠.
// 흐름: 소개·오늘의 행운 부적 → 원하는 행운 고르기(6종) → 부적이 뒤집히며 펼쳐지는 연출 → 이름·의미·추천 대상·활용법
//      → 이미지 저장 / 배경화면 저장 / 보관함에 담기 / 공유 → 내 부적 보관함. ?k=종류 로 바로 열기(소원빌기에서 연결).
// 풀이 비용 없는 고정 콘텐츠(src/brand/talisman.js). 전통 상징을 빌린 창작 디자인이며 효과를 약속하지 않음을 화면에 밝힘.
// 보관함은 이 브라우저에만(localStorage saju:talismans). 이모지 대신 글래스 아이콘·리퀴드 메탈 버튼.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TALISMANS, talismanById, talismanSvg, talismanPng, todayTalisman } from '../brand/talisman.js';
import GlassIcon from '../components/GlassIcon.jsx';
import LiquidMetalButton from '../components/LiquidMetalButton.jsx';
import ResultShare from '../components/ShareRow.jsx';
import { trackEvent } from '../lib/analytics.js';

const BOX = 'saju:talismans';
// 부적 종류 → 소원 종류 (만사형통 → 기타)
const TALISMAN_TO_WISH = { money: 'money', love: 'love', career: 'career', health: 'health', study: 'study', luck: 'etc' };
const loadBox = () => {
  try {
    const v = JSON.parse(localStorage.getItem(BOX) || '[]');
    return Array.isArray(v) ? v.filter((x) => talismanById(x.id)) : [];
  } catch {
    return [];
  }
};
const saveBox = (list) => {
  try {
    localStorage.setItem(BOX, JSON.stringify(list));
  } catch {
    /* 무시 */
  }
};
const Art = ({ id, className = '' }) => <span className={`tal-art ${className}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: talismanSvg(id) }} />;

export default function Talisman() {
  const [params, setParams] = useSearchParams();
  const [pick, setPick] = useState(() => (talismanById(params.get('k')) ? params.get('k') : null));
  const [revealing, setRevealing] = useState(false);
  const [box, setBox] = useState(loadBox);
  const [saving, setSaving] = useState('');
  const [msg, setMsg] = useState('');
  const today = todayTalisman();
  const t = pick ? talismanById(pick) : null;

  const choose = (id, from = 'grid') => {
    trackEvent('talisman_pick', { kind: id, from });
    setPick(id);
    setRevealing(true);
    setMsg('');
    setParams({ k: id }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => {
    if (!revealing) return undefined;
    const timer = setTimeout(() => setRevealing(false), 1700);
    return () => clearTimeout(timer);
  }, [revealing]);
  useEffect(() => {
    // 소원빌기에서 ?k= 로 들어오면 펼치는 연출부터
    if (pick && params.get('k') === pick) setRevealing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async (mode) => {
    if (!t) return;
    setSaving(mode);
    try {
      const blob = await talismanPng(t.id, mode);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `사주천문-${t.name}${mode === 'wallpaper' ? '-배경화면' : ''}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      trackEvent('talisman_save', { kind: t.id, mode });
      setMsg(mode === 'wallpaper' ? '배경화면 이미지를 저장했어요. 휴대폰 설정에서 배경화면으로 골라 보세요.' : '부적 이미지를 저장했어요.');
    } catch {
      setMsg('이미지를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    }
    setSaving('');
  };
  const keep = () => {
    if (!t) return;
    if (box.some((x) => x.id === t.id)) return setMsg('이미 보관함에 있는 부적이에요.');
    const next = [{ id: t.id, at: new Date().toISOString() }, ...box];
    setBox(next);
    saveBox(next);
    trackEvent('talisman_keep', { kind: t.id });
    setMsg('내 부적 보관함에 담았어요.');
  };
  const drop = (id) => {
    const next = box.filter((x) => x.id !== id);
    setBox(next);
    saveBox(next);
  };

  return (
    <article className="tal">
      {!t && (
        <section className="tal-hero">
          <p className="nm-kicker">행운의 부적</p>
          <h1 className="nm-title">
            지금 당신에게 필요한
            <br />
            행운은 무엇인가요?
          </h1>
          <p className="nm-lead">사랑, 재물, 건강, 취업… 원하는 행운을 고르면 천둥도사가 어울리는 부적을 펼쳐 드려요.</p>
          <div className="tal-fan" aria-hidden="true">
            {['love', 'money', 'career'].map((id, i) => (
              <Art key={id} id={id} className={`fan f${i}`} />
            ))}
          </div>
          {/* 오늘의 행운 부적 (2026-11-14 사용자 지시: 반짝 아이콘·금테·알약 버튼 없이 담백하게 — 실제 부적 종이 + 글 + 밑줄 글자 링크) */}
          <button type="button" className="tal-today" onClick={() => choose(today.id, 'today')}>
            <Art id={today.id} className="tal-today-paper" />
            <span className="tal-today-text">
              <small>
                {new Date().getMonth() + 1}월 {new Date().getDate()}일 · 오늘의 행운 부적
              </small>
              <b>{today.name}</b>
              <span>{today.short}</span>
            </span>
            <span className="tal-today-go">펼쳐 보기</span>
          </button>
        </section>
      )}

      {t && (
        <section className={`tal-result${revealing ? ' is-revealing' : ''}`} aria-live="polite">
          <div className="tal-stage">
            <span className="tal-rays" aria-hidden="true" />
            <div className="tal-flip">
              <span className="tal-back" aria-hidden="true">
                <b>天文</b>
              </span>
              <Art id={t.id} className="tal-front" />
            </div>
          </div>
          {!revealing && (
            <>
              <p className="nm-kicker">부적을 펼쳤어요</p>
              <h1 className="tal-name">{t.name}</h1>
              <p className="tal-cheer">{t.cheer}</p>
              <dl className="tal-info card">
                <div>
                  <dt>부적의 의미</dt>
                  <dd>{t.meaning}</dd>
                </div>
                <div>
                  <dt>이런 분께 추천해요</dt>
                  <dd>{t.forWho}</dd>
                </div>
                <div>
                  <dt>이렇게 써 보세요</dt>
                  <dd>{t.use}</dd>
                </div>
              </dl>
              <p className="tal-note">전통 부적의 모양과 상징을 빌려 사주천문이 만든 창작 부적이에요. 재물·건강·합격 같은 결과를 약속하지는 않아요.</p>
              <div className="tal-actions">
                <LiquidMetalButton label={saving === 'wallpaper' ? '만드는 중…' : '배경화면으로 저장'} width={220} onClick={() => download('wallpaper')} disabled={!!saving} />
                <div className="tal-actions-row">
                  <button type="button" className="btn-ghost" onClick={() => download('card')} disabled={!!saving}>
                    {saving === 'card' ? '만드는 중…' : '이미지 저장'}
                  </button>
                  <button type="button" className="btn-ghost" onClick={keep}>
                    보관함에 담기
                  </button>
                </div>
                {msg && (
                  <p className="tal-msg" role="status">
                    {msg}
                  </p>
                )}
              </div>
              <Link to={`/wish?write=1&cat=${TALISMAN_TO_WISH[t.id] || 'etc'}`} className="tal-wish card" onClick={() => trackEvent('talisman_to_wish', { kind: t.id })}>
                <GlassIcon kind="sky" size="sm" />
                <span>
                  <b>이 행운을 소원으로도 띄워 볼까요?</b>
                  <small>이 부적과 같은 종류의 소원 쓰기 창이 바로 열려요</small>
                </span>
              </Link>
              <ResultShare
                title="행운의 부적을 나눠 보세요"
                path={`/talisman?k=${t.id}`}
                kakao={{ title: `천둥도사가 펼쳐 준 ${t.name}`, description: '지금 나에게 필요한 행운의 부적을 펼쳐 보세요.', button: '부적 펼치기' }}
              />
            </>
          )}
        </section>
      )}

      <section className="tal-pick">
        <h2 className="tal-h2">{t ? '다른 행운도 펼쳐 보세요' : '어떤 행운을 원하시나요?'}</h2>
        <p className="tal-sub">마음이 가는 부적을 골라 보세요.</p>
        <ul className="tal-grid">
          {TALISMANS.map((x) => (
            <li key={x.id}>
              <button type="button" className={`tal-card${pick === x.id ? ' on' : ''}`} onClick={() => choose(x.id)}>
                <Art id={x.id} className="mini" />
                <span className="tal-card-text">
                  <b>{x.name.replace(' 부적', '')}</b>
                  <span>{x.short}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {box.length > 0 && (
        <section className="tal-box">
          <h2 className="tal-h2">내 부적 보관함</h2>
          <p className="tal-sub">이 브라우저에 담아 둔 부적이에요.</p>
          <ul className="tal-box-list">
            {box.map((x) => {
              const b = talismanById(x.id);
              return (
                <li key={x.id}>
                  <button type="button" className="tal-box-item" onClick={() => choose(x.id, 'box')} aria-label={`${b.name} 다시 보기`}>
                    <Art id={x.id} className="mini" />
                    <b>{b.name.replace(' 부적', '')}</b>
                    <small>{new Date(x.at).toLocaleDateString('ko-KR')}</small>
                  </button>
                  <button type="button" className="tal-box-del" onClick={() => drop(x.id)} aria-label={`${b.name} 보관함에서 빼기`}>
                    빼기
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
