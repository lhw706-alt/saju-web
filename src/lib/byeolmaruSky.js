// 별마루 하늘 상태 (2026-11-15 사용자 지시 '다 해줘' 1묶음): 진짜 달 모양 · 시간대 하늘색 · 특별한 날 · 오늘의 일진.
// 모두 날짜·시각(KST)만으로 계산 — 서버·풀이 비용 없음. 만세력은 사주 계산과 같은 lunar-javascript.
import lunar from 'lunar-javascript';

const { Solar } = lunar;
const GAN_KO = { 甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계' };
const ZHI_KO = { 子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해' };
const GAN_EL = { 甲: '나무', 乙: '나무', 丙: '불', 丁: '불', 戊: '흙', 己: '흙', 庚: '쇠', 辛: '쇠', 壬: '물', 癸: '물' };
const EL_LINE = {
  나무: '뻗어 나가는 나무의 기운이에요. 새로 시작하기 좋은 날이에요.',
  불: '밝게 타오르는 불의 기운이에요. 마음을 표현하기 좋은 날이에요.',
  흙: '든든한 흙의 기운이에요. 차분히 다지기 좋은 날이에요.',
  쇠: '단단한 쇠의 기운이에요. 정리하고 매듭짓기 좋은 날이에요.',
  물: '흐르는 물의 기운이에요. 쉬어 가며 생각을 고르기 좋은 날이에요.',
};

// KST 지금
export function kstNow() {
  const d = new Date(Date.now() + 9 * 3600e3);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), ymd: d.toISOString().slice(0, 10) };
}

// 특별한 날 (음력 명절·절기·유성우)
function specialOf(now, l) {
  const lm = Math.abs(l.getMonth());
  const ld = l.getDay();
  const jq = l.getJieQi();
  const md = now.m * 100 + now.d;
  if (lm === 1 && ld === 1) return { id: 'seollal', kind: 'lanterns', title: '설날', line: '새해 첫날이에요. 올해의 첫 등불을 띄워 보세요.' };
  if (lm === 1 && ld === 15) return { id: 'daeboreum', kind: 'fullmoon', title: '정월대보름', line: '한 해 가장 큰 보름달이 떴어요. 달에게 소원을 빌어 보세요.' };
  if (lm === 7 && ld === 7) return { id: 'chilseok', kind: 'meteor', title: '칠석', line: '견우와 직녀가 만나는 밤이에요. 은하수가 유난히 밝아요.' };
  if (lm === 8 && ld === 15) return { id: 'chuseok', kind: 'fullmoon', title: '추석', line: '한가위 보름달이 떴어요. 가족의 안녕을 빌어 보세요.' };
  if (jq === '冬至') return { id: 'dongji', kind: 'lanterns', title: '동지', line: '밤이 가장 긴 날이에요. 이제부터 해가 길어져요.' };
  if (md === 103 || md === 104) return { id: 'meteor-q', kind: 'meteor', title: '사분의자리 유성우', line: '별똥별이 쏟아지는 밤이에요. 하늘을 올려다보세요.' };
  if (md === 812 || md === 813) return { id: 'meteor-p', kind: 'meteor', title: '페르세우스자리 유성우', line: '별똥별이 쏟아지는 밤이에요. 하늘을 올려다보세요.' };
  if (md === 1213 || md === 1214) return { id: 'meteor-g', kind: 'meteor', title: '쌍둥이자리 유성우', line: '별똥별이 쏟아지는 밤이에요. 하늘을 올려다보세요.' };
  if (ld === 15) return { id: 'boreum', kind: 'fullmoon', title: '보름', line: '둥근 보름달이 떴어요.' };
  return null;
}

// 하늘 한 번에: { phase(0 새달 ~ 0.5 보름 ~ 1), lunarDay, hour, time: 'dusk'|'night'|'dawn', special, ilji }
export function skyState() {
  const now = kstNow();
  const l = Solar.fromYmd(now.y, now.m, now.d).getLunar();
  const lunarDay = l.getDay();
  const phase = ((lunarDay - 1) % 30) / 29.5;
  const h = now.h;
  const time = h >= 17 && h < 21 ? 'dusk' : h >= 4 && h < 8 ? 'dawn' : 'night';
  const gz = l.getDayInGanZhi();
  const gan = gz[0];
  const zhi = gz[1];
  const el = GAN_EL[gan];
  return {
    now,
    phase,
    lunarDay,
    time,
    special: specialOf(now, l),
    ilji: { hanja: gz, ko: `${GAN_KO[gan]}${ZHI_KO[zhi]}`, element: el, line: EL_LINE[el] },
  };
}

// 시간대별 하늘·안개 색
export const SKY_COLORS = {
  dusk: { top: '#0b0f2e', mid: '#2a1f4f', bottom: '#6b3a5e', fog: '#2a1f4f' },
  night: { top: '#070a1f', mid: '#141a3d', bottom: '#2b2150', fog: '#141a3d' },
  dawn: { top: '#0c1a3a', mid: '#1f3d6b', bottom: '#5a6f9e', fog: '#1f3d6b' },
};
