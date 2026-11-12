// 생년월일시를 한 화면에 하나씩 순서대로 묻는 입력 (성별 → 생년월일 → 태어난 시각 → 태어난 곳).
// 입력값은 저장하지 않고 onSubmit 으로만 넘긴다 (Start.jsx 가 sessionStorage 에 잠시 둠).
import { useEffect, useRef, useState } from 'react';
import { CITIES, computeSaju, SajuInputError } from '../lib/saju.js';

const EMPTY = { calendar: 'solar', leap: false, year: '', month: '', day: '', timeKnown: true, hour: '', minute: '0', gender: '', city: 'seoul' };
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const STEPS = ['성별', '생년월일', '태어난 시각', '태어난 곳'];
const QUESTIONS = ['성별을 골라 주세요', '언제 태어났나요?', '몇 시에 태어났나요?', '어디에서 태어났나요?'];

export default function StepForm({ initial, onSubmit }) {
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const yearRef = useRef(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));

  useEffect(() => {
    setError('');
    if (step === 1) yearRef.current?.focus();
  }, [step]);

  const check = (data) => {
    try {
      computeSaju(data);
      return true;
    } catch (err) {
      setError(err instanceof SajuInputError ? err.message : '입력값을 다시 확인해 주세요.');
      return false;
    }
  };

  const pickGender = (g) => {
    setF((p) => ({ ...p, gender: g }));
    setStep(1);
  };
  // 생년월일만 먼저 검사 (시각은 다음 단계에서)
  const nextFromDate = () => {
    if (!f.year || !f.month || !f.day) return setError('태어난 연·월·일을 모두 넣어 주세요.');
    if (check({ ...f, timeKnown: false })) setStep(2);
  };
  const nextFromTime = () => {
    if (f.timeKnown && f.hour === '') return setError('태어난 시를 골라 주세요. 모르면 “시각을 몰라요”를 눌러 주세요.');
    setStep(3);
  };
  const timeUnknown = () => {
    setF((p) => ({ ...p, timeKnown: false, hour: '' }));
    setStep(3);
  };
  const submit = (e) => {
    e.preventDefault();
    if (step === 1) return nextFromDate();
    if (step === 2) return nextFromTime();
    if (step !== 3) return;
    if (check(f)) onSubmit(f);
  };

  return (
    <form className="steps card" onSubmit={submit} noValidate>
      <div className="steps-head">
        <div className="steps-bar" aria-hidden="true">
          <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <p className="steps-count">
          <b>{step + 1}</b> / {STEPS.length} · {STEPS[step]}
        </p>
      </div>

      <div className="step" key={step}>
        <h2 className="step-q">{QUESTIONS[step]}</h2>

        {step === 0 && (
          <div className="step-choices">
            {[['female', '여성'], ['male', '남성']].map(([v, l]) => (
              <button key={v} type="button" className={`step-choice${f.gender === v ? ' on' : ''}`} onClick={() => pickGender(v)}>
                {l}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <>
            <div className="seg seg-sm" role="radiogroup" aria-label="양력·음력">
              {[['solar', '양력'], ['lunar', '음력']].map(([v, l]) => (
                <label key={v} className={f.calendar === v ? 'on' : ''}>
                  <input type="radio" name="calendar" value={v} checked={f.calendar === v} onChange={set('calendar')} />
                  {l}
                </label>
              ))}
            </div>
            <div className="row3">
              <label className="input">
                <input ref={yearRef} inputMode="numeric" maxLength={4} placeholder="1990" value={f.year} onChange={set('year')} aria-label="출생 연도" />
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
          </>
        )}

        {step === 2 && (
          <>
            <div className="row2">
              <select value={f.timeKnown ? f.hour : ''} onChange={(e) => setF((p) => ({ ...p, hour: e.target.value, timeKnown: true }))} aria-label="시">
                <option value="">시</option>
                {HOURS.map((h) => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}시</option>
                ))}
              </select>
              <select value={f.minute} onChange={set('minute')} aria-label="분">
                {MINUTES.map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}분</option>
                ))}
              </select>
            </div>
            <button type="button" className="step-skip" onClick={timeUnknown}>
              시각을 몰라요 <small>시주 없이 여섯 글자로 봐요</small>
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <select value={f.city} onChange={set('city')} aria-label="태어난 곳">
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="hint">태어난 곳의 경도로 실제 태양 시각을 맞춰 시주를 정해요. 서울은 표준시보다 약 32분 늦어요.</p>
          </>
        )}

        {error && <p className="error" role="alert">{error}</p>}
      </div>

      <div className="steps-nav">
        {step > 0 && (
          <button type="button" className="step-back" onClick={() => setStep((s) => s - 1)}>
            이전
          </button>
        )}
        {step > 0 && (
          <button type="submit" className="btn-primary">
            {step === 3 ? '사주 펼쳐 보기' : '다음'}
          </button>
        )}
      </div>
      <p className="hint center">이름·연락처는 받지 않아요. 입력한 생년월일시는 저장하지 않습니다.</p>
    </form>
  );
}
