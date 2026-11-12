import { useState } from 'react';
import { CITIES, computeSaju, SajuInputError } from '../lib/saju.js';

const EMPTY = { calendar: 'solar', leap: false, year: '', month: '', day: '', timeKnown: true, hour: '', minute: '0', gender: '', city: 'seoul' };

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export default function BirthForm({ initial, onSubmit }) {
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));

  const submit = (e) => {
    e.preventDefault();
    if (f.timeKnown && f.hour === '') return setError('태어난 시를 골라 주세요. 모르면 “시각 모름”을 체크하세요.');
    try {
      computeSaju(f); // 입력 검사
    } catch (err) {
      setError(err instanceof SajuInputError ? err.message : '입력값을 다시 확인해 주세요.');
      return;
    }
    setError('');
    onSubmit(f);
  };

  return (
    <form className="form card" onSubmit={submit} noValidate>
      <fieldset className="field">
        <legend>성별</legend>
        <div className="seg">
          {[['female', '여성'], ['male', '남성']].map(([v, l]) => (
            <label key={v} className={f.gender === v ? 'on' : ''}>
              <input type="radio" name="gender" value={v} checked={f.gender === v} onChange={set('gender')} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>생년월일</legend>
        <div className="seg seg-sm">
          {[['solar', '양력'], ['lunar', '음력']].map(([v, l]) => (
            <label key={v} className={f.calendar === v ? 'on' : ''}>
              <input type="radio" name="calendar" value={v} checked={f.calendar === v} onChange={set('calendar')} />
              {l}
            </label>
          ))}
        </div>
        <div className="row3">
          <label className="input">
            <input inputMode="numeric" maxLength={4} placeholder="1990" value={f.year} onChange={set('year')} aria-label="출생 연도" />
            <span>년</span>
          </label>
          <label className="input">
            <input inputMode="numeric" maxLength={2} placeholder="5" value={f.month} onChange={set('month')} aria-label="출생 월" />
            <span>월</span>
          </label>
          <label className="input">
            <input inputMode="numeric" maxLength={2} placeholder="15" value={f.day} onChange={set('day')} aria-label="출생 일" />
            <span>일</span>
          </label>
        </div>
        {f.calendar === 'lunar' && (
          <label className="check">
            <input type="checkbox" checked={f.leap} onChange={set('leap')} /> 윤달
          </label>
        )}
      </fieldset>

      <fieldset className="field">
        <legend>태어난 시각</legend>
        <div className="row2">
          <select value={f.hour} onChange={set('hour')} disabled={!f.timeKnown} aria-label="시">
            <option value="">시</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}시</option>
            ))}
          </select>
          <select value={f.minute} onChange={set('minute')} disabled={!f.timeKnown} aria-label="분">
            {MINUTES.map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}분</option>
            ))}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={!f.timeKnown} onChange={(e) => setF((p) => ({ ...p, timeKnown: !e.target.checked }))} /> 시각 모름
          <small>시주 없이 여섯 글자로 봅니다</small>
        </label>
      </fieldset>

      <fieldset className="field">
        <legend>태어난 곳</legend>
        <select value={f.city} onChange={set('city')} aria-label="태어난 곳">
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <p className="hint">한국 표준시는 동경 135°가 기준이라 서울의 실제 태양 시각은 약 32분 늦습니다. 태어난 곳의 경도로 시각을 보정해 시주를 정합니다.</p>
      </fieldset>

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" className="btn-primary">사주 펼쳐 보기</button>
      <p className="hint center">이름·연락처는 받지 않아요. 입력한 생년월일시는 저장하지 않습니다.</p>
    </form>
  );
}
