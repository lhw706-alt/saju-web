// 입력했던 정보 불러오기 (2026-11-15 사용자 지시: 가로 3칸 카드, 생년월일·시각만, 연필 아이콘으로 이 자리에서 수정).
// 카드를 누르면 바로 그 정보로 결과. 연필을 누르면 카드 아래에 자세한 정보(양·음력, 날짜, 시각, 성별, 태어난 곳) 수정 칸.
// 이 브라우저 목록은 localStorage(saju:presets) — 입력을 마치면 자동 저장. '내 정보'는 계정(/api/auth/birth)에 저장.
import { useEffect, useState } from 'react';
import Select from './Select.jsx';
import { CITIES, computeSaju, SajuInputError } from '../lib/saju.js';
import { loadPresets, removePreset, updatePreset } from '../lib/storage.js';
import { presetMain, presetSub } from '../lib/presetText.js';
import { askConfirm } from './ConfirmHost.jsx';

const CITY_OPTIONS = CITIES.map((c) => ({ value: c.id, label: c.name }));
const HOUR_OPTIONS = [{ value: '', label: '시각 모름' }, ...Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: `${String(i).padStart(2, '0')}시` }))];
const keyOf = (x) => presetMain(x) + presetSub(x);
const dateLine = (p) => `${p.year}.${String(p.month).padStart(2, '0')}.${String(p.day).padStart(2, '0')}${p.calendar === 'lunar' ? ' (음)' : ''}`;
const timeLine = (p) => (p.timeKnown ? `${String(p.hour).padStart(2, '0')}:${String(p.minute || 0).padStart(2, '0')}` : '시각 모름');

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function EditPanel({ value, isMine, onSave, onDelete, onCancel }) {
  const [f, setF] = useState({ ...value, hour: value.timeKnown ? String(value.hour) : '', minute: value.timeKnown ? String(value.minute || 0) : '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    const data = {
      calendar: f.calendar,
      leap: f.calendar === 'lunar' && !!f.leap,
      year: String(f.year).trim(),
      month: String(f.month).trim(),
      day: String(f.day).trim(),
      timeKnown: f.hour !== '',
      hour: f.hour,
      minute: f.hour === '' ? '' : String(f.minute === '' ? 0 : Number(f.minute)),
      gender: f.gender,
      city: f.city,
    };
    try {
      computeSaju(data);
    } catch (e) {
      return setErr(e instanceof SajuInputError ? e.message : '입력값을 다시 확인해 주세요.');
    }
    setBusy(true);
    const r = await onSave(data);
    setBusy(false);
    if (r) setErr(r);
  };
  return (
    <div className="saved-edit" role="group" aria-label="정보 수정">
      <div className="saved-edit-row">
        <span className="saved-edit-label">달력</span>
        <div className="saved-seg">
          {[
            ['solar', '양력'],
            ['lunar', '음력'],
          ].map(([v, l]) => (
            <button key={v} type="button" className={f.calendar === v ? 'on' : ''} onClick={() => set('calendar', v)}>
              {l}
            </button>
          ))}
        </div>
        {f.calendar === 'lunar' && (
          <label className="saved-leap">
            <input type="checkbox" checked={!!f.leap} onChange={(e) => set('leap', e.target.checked)} /> 윤달
          </label>
        )}
      </div>
      <div className="saved-edit-row">
        <span className="saved-edit-label">생년월일</span>
        <span className="input saved-num">
          <input inputMode="numeric" maxLength={4} value={f.year} onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))} aria-label="연도" />
          <em>년</em>
        </span>
        <span className="input saved-num sm">
          <input inputMode="numeric" maxLength={2} value={f.month} onChange={(e) => set('month', e.target.value.replace(/\D/g, ''))} aria-label="월" />
          <em>월</em>
        </span>
        <span className="input saved-num sm">
          <input inputMode="numeric" maxLength={2} value={f.day} onChange={(e) => set('day', e.target.value.replace(/\D/g, ''))} aria-label="일" />
          <em>일</em>
        </span>
      </div>
      <div className="saved-edit-row">
        <span className="saved-edit-label">태어난 시각</span>
        <span className="saved-hour">
          <Select ariaLabel="시" value={f.hour} onChange={(v) => set('hour', v)} options={HOUR_OPTIONS} />
        </span>
        {f.hour !== '' && (
          <span className="input saved-num sm">
            <input inputMode="numeric" maxLength={2} value={f.minute} placeholder="0" onChange={(e) => set('minute', e.target.value.replace(/\D/g, ''))} aria-label="분" />
            <em>분</em>
          </span>
        )}
      </div>
      <div className="saved-edit-row">
        <span className="saved-edit-label">성별</span>
        <div className="saved-seg">
          {[
            ['female', '여성'],
            ['male', '남성'],
          ].map(([v, l]) => (
            <button key={v} type="button" className={f.gender === v ? 'on' : ''} onClick={() => set('gender', v)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="saved-edit-row">
        <span className="saved-edit-label">태어난 곳</span>
        <span className="saved-city">
          <Select ariaLabel="태어난 곳" value={f.city} onChange={(v) => set('city', v)} options={CITY_OPTIONS} />
        </span>
      </div>
      {err && (
        <p className="nm-err" role="alert">
          {err}
        </p>
      )}
      <div className="saved-edit-actions">
        {!isMine && (
          <button type="button" className="saved-edit-del" onClick={onDelete}>
            지우기
          </button>
        )}
        <button type="button" className="saved-edit-cancel" onClick={onCancel}>
          취소
        </button>
        <button type="button" className="saved-edit-save" onClick={save} disabled={busy}>
          {busy ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
}

// mine: 계정에 등록한 내 사주 정보(없으면 null), onPick: 그 정보로 바로 결과
// manage: 마이페이지용 — 카드를 누르면 수정 칸이 열리고, 제목·안내만 바뀜(입력 화면과 같은 카드 UI, 2026-11-15)
export default function SavedPresets({ mine: mineProp, onPick, manage = false, title, note }) {
  const [presets, setPresets] = useState(loadPresets);
  const [mine, setMine] = useState(mineProp);
  useEffect(() => setMine(mineProp), [mineProp]); // 로그인 정보가 늦게 오면 맞춰 줌
  const [editing, setEditing] = useState(null); // 'mine' | 카드 key
  const others = mine ? presets.filter((x) => keyOf(x) !== keyOf(mine)) : presets;
  const cards = [...(mine ? [{ ...mine, _mine: true }] : []), ...others];
  if (!cards.length) return manage ? <p className="my-sec-note">아직 저장된 정보가 없어요. 사주를 보면 자동으로 기억해요.</p> : null;
  const cur = editing === 'mine' ? mine : others.find((x) => keyOf(x) === editing);

  const saveEdit = async (data) => {
    if (editing === 'mine') {
      const r = await fetch('/api/auth/birth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: data }) }).catch(() => null);
      const d = await r?.json().catch(() => ({}));
      if (!r?.ok) return d?.error || '저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
      setMine(d.birth || data);
    } else {
      setPresets(updatePreset(cur, data));
    }
    setEditing(null);
    return '';
  };
  const del = async () => {
    if (!(await askConfirm({ title: '이 정보를 지울까요?', message: `${presetMain(cur)} 정보를 불러오기 목록에서 지워요.`, ok: '지우기' }))) return;
    setPresets(removePreset(cur));
    setEditing(null);
  };

  return (
    <div className="saved">
      {!manage && (
        <div className="saved-head">
          <h2 className="saved-title">{title || '입력했던 정보를 불러올 수 있어요'}</h2>
          <p className="saved-note">{note || '입력을 마치면 최근 5명까지 자동으로 기억해요'}</p>
        </div>
      )}
      <ul className="saved-grid">
        {cards.map((x) => {
          const k = x._mine ? 'mine' : keyOf(x);
          return (
            <li key={k} className={`saved-card${x._mine ? ' is-mine' : ''}${editing === k ? ' is-editing' : ''}`}>
              <button type="button" className="saved-card-main" onClick={() => (manage ? setEditing(editing === k ? null : k) : onPick(x))} aria-label={manage ? `${presetMain(x)} 정보 수정` : `${presetMain(x)} ${presetSub(x)} 정보로 보기`}>
                {x._mine && <span className="saved-card-badge">내 정보</span>}
                <b>{dateLine(x)}</b>
                <span>{timeLine(x)}</span>
              </button>
              <button type="button" className="saved-card-edit" aria-label={`${presetMain(x)} 정보 수정`} aria-expanded={editing === k} onClick={() => setEditing(editing === k ? null : k)}>
                <PencilIcon />
              </button>
            </li>
          );
        })}
      </ul>
      {cur && <EditPanel key={editing} value={cur} isMine={editing === 'mine'} onSave={saveEdit} onDelete={del} onCancel={() => setEditing(null)} />}
      {!manage && (
        <p className="saved-or">
          <span>또는 새로 입력해요</span>
        </p>
      )}
    </div>
  );
}
