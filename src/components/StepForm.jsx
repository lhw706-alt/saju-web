// 생년월일시를 한 화면에 하나씩 순서대로 묻는 입력 (성별 → 생년월일 → 태어난 시각 → 태어난 곳).
// 입력값은 저장하지 않고 onSubmit 으로만 넘긴다 (Start.jsx 가 sessionStorage 에 잠시 둠).
import { useEffect, useRef, useState } from 'react';
import { CITIES, computeSaju, SajuInputError } from '../lib/saju.js';
import Select from './Select.jsx';
import { loadPresets, savePreset, removePreset } from '../lib/storage.js';

// 저장된 정보 한 줄: 큰 글씨(생년월일·성별) / 작은 글씨(양음력·시각·지역)
function presetMain(p) {
  return `${p.year}.${p.month}.${p.day} · ${p.gender === 'male' ? '남성' : '여성'}`;
}
function presetSub(p) {
  const city = CITIES.find((c) => c.id === p.city)?.name || '';
  const time = p.timeKnown ? `${String(p.hour).padStart(2, '0')}:${String(p.minute || 0).padStart(2, '0')}` : '시각 모름';
  return [p.calendar === 'lunar' ? `음력${p.leap ? '(윤달)' : ''}` : '양력', time, city].join(' · ');
}

const EMPTY = { calendar: 'solar', leap: false, year: '', month: '', day: '', timeKnown: true, hour: '', minute: '', gender: '', city: 'seoul' };
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: `${String(i).padStart(2, '0')}시` }));
// 분은 0~59 를 직접 입력 (5분 단위 목록이면 정확한 시각을 못 넣음). 비우면 0분
const CITY_OPTIONS = CITIES.map((c) => ({ value: c.id, label: c.name }));
const STEPS = ['성별', '생년월일', '태어난 시각', '태어난 곳'];
const QUESTIONS = ['성별을 골라 주세요', '언제 태어났나요?', '몇 시에 태어났나요?', '어디에서 태어났나요?'];

// showSaved=false: 저장된 정보 목록 숨김 (마이페이지 등록용), submitLabel: 마지막 버튼 글자
export default function StepForm({ initial, onSubmit, showSaved = true, submitLabel = '사주 펼쳐 보기' }) {
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [minuteError, setMinuteError] = useState(''); // 분 칸 바로 아래에 보이는 안내
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
    const min = f.minute === '' ? 0 : Number(f.minute);
    if (f.timeKnown && !(min >= 0 && min <= 59)) return setMinuteError('분은 0에서 59까지만 적을 수 있어요.');
    setF((p) => ({ ...p, minute: String(min) }));
    setStep(3);
  };
  const timeUnknown = () => {
    setF((p) => ({ ...p, timeKnown: false, hour: '' }));
    setStep(3);
  };
  // 이 브라우저에 기억해 둔 지난 입력: 목록에서 줄을 누르면 바로 불러오기, ✕ 로 지우기 (2명까지 보이고 나머지는 더 보기)
  const [presets, setPresets] = useState(loadPresets);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? presets : presets.slice(0, 2);
  const finish = (data) => {
    savePreset(data); // 입력을 마치면 이 브라우저에 바로 기억 (불러오기용)
    onSubmit(data);
  };
  const applyPreset = (x) => {
    if (check(x)) onSubmit(x); // 불러오면 바로 결과로
  };
  const deletePreset = (x) => setPresets(removePreset(x));

  const submit = (e) => {
    e.preventDefault();
    if (step === 1) return nextFromDate();
    if (step === 2) return nextFromTime();
    if (step !== 3) return;
    if (check(f)) finish(f);
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

        {step === 0 && showSaved && presets.length > 0 && (
          <div className="saved">
            <div className="saved-head">
              <h2 className="saved-title">입력했던 정보를 불러올 수 있어요</h2>
              <p className="saved-note">최근 5명까지 기억해요</p>
            </div>
            <ul className="saved-list">
              {shown.map((x) => (
                <li key={presetMain(x) + presetSub(x)} className="saved-item">
                  <button type="button" className="saved-load" onClick={() => applyPreset(x)}>
                    <span className="saved-text">
                      <b>{presetMain(x)}</b>
                      <span>{presetSub(x)}</span>
                    </span>
                    <span className="saved-go">불러오기</span>
                  </button>
                  <button type="button" className="saved-del" aria-label={`${presetMain(x)} 지우기`} onClick={() => deletePreset(x)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            {presets.length > 2 && (
              <button type="button" className="saved-more" onClick={() => setShowAll((v) => !v)}>
                {showAll ? '접기' : `${presets.length - 2}명 더 보기`}
              </button>
            )}
            <p className="saved-or">
              <span>또는 새로 입력해요</span>
            </p>
          </div>
        )}

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
              <Select
                ariaLabel="시"
                placeholder="시"
                value={f.timeKnown ? f.hour : ''}
                onChange={(v) => setF((p) => ({ ...p, hour: String(v), timeKnown: true }))}
                options={HOUR_OPTIONS}
              />
              <div className="field-with-msg">
              <label className="input">
                <input
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="0"
                  value={f.minute}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '');
                    // 60 이상을 적으면 칸을 비우고 바로 안내
                    if (v !== '' && Number(v) > 59) {
                      setF((p) => ({ ...p, minute: '', timeKnown: true }));
                      setMinuteError('분은 0에서 59까지만 적을 수 있어요.');
                      return;
                    }
                    setMinuteError('');
                    setF((p) => ({ ...p, minute: v, timeKnown: true }));
                  }}
                  aria-label="태어난 분"
                  aria-invalid={!!minuteError}
                  aria-describedby={minuteError ? 'minute-err' : undefined}
                />
                <span>분</span>
              </label>
              {minuteError && (
                <p id="minute-err" className="field-msg" role="alert">
                  {minuteError}
                </p>
              )}
              </div>
            </div>
            <button type="button" className="step-skip" onClick={timeUnknown}>
              시각을 몰라요 <small>시주 없이 여섯 글자로 봐요</small>
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <Select ariaLabel="태어난 곳" value={f.city} onChange={(v) => setF((p) => ({ ...p, city: v }))} options={CITY_OPTIONS} />
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
            {step === 3 ? submitLabel : '다음'}
          </button>
        )}
      </div>
    </form>
  );
}
