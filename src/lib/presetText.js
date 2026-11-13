// 저장된 사주 정보 한 줄 글자 (입력 화면의 불러오기 목록 · 마이페이지 공용)
// 큰 글씨: 2020년 2월 4일 · 남성 / 작은 글씨: 양력 · 14:30(또는 시간 미상) · 서울
import { CITIES, manAge } from './saju.js';

export const birthDateText = (p) => `${p.year}년 ${p.month}월 ${p.day}일`;
export const genderText = (p) => (p.gender === 'male' ? '남성' : '여성');
export const presetMain = (p) => `${birthDateText(p)} · ${genderText(p)}`;
export const presetSub = (p) => {
  const city = CITIES.find((c) => c.id === p.city)?.name || '';
  const time = p.timeKnown ? `${String(p.hour).padStart(2, '0')}:${String(p.minute || 0).padStart(2, '0')}` : '시간 미상';
  return [p.calendar === 'lunar' ? `음력${p.leap ? '(윤달)' : ''}` : '양력', time, city].join(' · ');
};
export const ageText = (p) => {
  const a = manAge(p);
  return a == null ? '' : `만 ${a}세`;
};
