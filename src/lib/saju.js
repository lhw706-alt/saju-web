// 만세력 계산 (브라우저와 Netlify 함수가 함께 사용)
//
// 계산 순서
// 1. 입력한 시각(한국 벽시계 시각)을 Asia/Seoul 시간대 기록으로 UTC 로 바꾼다.
//    → 1954~1961년 UTC+8:30 표준시, 1948~1960·1987~1988년 서머타임이 자동 반영된다.
// 2. 연주·월주(절기 기준)는 lunar-javascript 의 절기 시각 기준(UTC+8)으로 계산한다.
// 3. 일주·시주는 출생지 경도로 보정한 지방 평균태양시로 계산한다 (서울은 표준시보다 약 32분 늦음).
//    '보정 안 함'을 고르면 입력 시각 그대로 쓴다.
// 4. 십성·지장간·12운성·오행 분포는 일간 기준으로 이 파일의 표로 계산한다.
// 5. 대운은 lunar-javascript 의 기운법(3일 = 1년)을 쓴다.

import lunar from 'lunar-javascript';

const { Solar, Lunar } = lunar;

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEM_KO = { 甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계' };
const BRANCH_KO = { 子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해' };
const BRANCH_ANIMAL = { 子: '쥐', 丑: '소', 寅: '호랑이', 卯: '토끼', 辰: '용', 巳: '뱀', 午: '말', 未: '양', 申: '원숭이', 酉: '닭', 戌: '개', 亥: '돼지' };

export const ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'];
export const ELEMENT_KO = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
export const ELEMENT_HANJA = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };

const STEM_ELEMENT = { 甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water' };
const BRANCH_ELEMENT = { 子: 'water', 丑: 'earth', 寅: 'wood', 卯: 'wood', 辰: 'earth', 巳: 'fire', 午: 'fire', 未: 'earth', 申: 'metal', 酉: 'metal', 戌: 'earth', 亥: 'water' };
// 음양: 천간은 순서 짝수가 양. 지지는 명리 관례(子·午·巳·亥 체용 구분)에 따라 '용(用)' 기준.
const STEM_YANG = (s) => STEMS.indexOf(s) % 2 === 0;
const BRANCH_YANG = { 子: false, 丑: false, 寅: true, 卯: false, 辰: true, 巳: true, 午: false, 未: false, 申: true, 酉: false, 戌: true, 亥: true };

// 지장간 (본기를 맨 앞에 둠)
const HIDDEN = {
  子: ['癸', '壬'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙', '甲'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己', '丙'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛', '庚'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};

const GENERATES = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
const CONTROLS = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

// 일간 기준 십성
export function tenGod(dayStem, element, yang) {
  const me = STEM_ELEMENT[dayStem];
  const same = STEM_YANG(dayStem) === yang;
  if (element === me) return same ? '비견' : '겁재';
  if (GENERATES[me] === element) return same ? '식신' : '상관';
  if (CONTROLS[me] === element) return same ? '편재' : '정재';
  if (CONTROLS[element] === me) return same ? '편관' : '정관';
  return same ? '편인' : '정인'; // element 가 나를 생함
}

const TWELVE = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
const BIRTH_BRANCH = { 甲: '亥', 丙: '寅', 戊: '寅', 庚: '巳', 壬: '申', 乙: '午', 丁: '酉', 己: '酉', 辛: '子', 癸: '卯' };
export function twelveStage(dayStem, branch) {
  const start = BRANCHES.indexOf(BIRTH_BRANCH[dayStem]);
  const b = BRANCHES.indexOf(branch);
  const step = STEM_YANG(dayStem) ? (b - start + 12) % 12 : (start - b + 12) % 12;
  return TWELVE[step];
}

// 출생지 (경도). 지방 평균태양시 보정에 사용.
export const CITIES = [
  { id: 'seoul', name: '서울', lon: 126.98 },
  { id: 'incheon', name: '인천', lon: 126.71 },
  { id: 'suwon', name: '수원·경기 남부', lon: 127.03 },
  { id: 'chuncheon', name: '춘천', lon: 127.73 },
  { id: 'gangneung', name: '강릉', lon: 128.88 },
  { id: 'cheongju', name: '청주', lon: 127.49 },
  { id: 'daejeon', name: '대전·세종', lon: 127.38 },
  { id: 'jeonju', name: '전주', lon: 127.15 },
  { id: 'gwangju', name: '광주', lon: 126.85 },
  { id: 'daegu', name: '대구', lon: 128.6 },
  { id: 'pohang', name: '포항', lon: 129.37 },
  { id: 'ulsan', name: '울산', lon: 129.31 },
  { id: 'busan', name: '부산', lon: 129.08 },
  { id: 'changwon', name: '창원', lon: 128.68 },
  { id: 'jeju', name: '제주', lon: 126.53 },
  { id: 'none', name: '보정 안 함 (입력 시각 그대로)', lon: null },
];

// Asia/Seoul 벽시계 시각 → UTC 밀리초 (과거 표준시·서머타임 반영)
const seoulFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul', hourCycle: 'h23',
  year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
});
function seoulOffsetMs(utcMs) {
  const p = Object.fromEntries(seoulFmt.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}
function seoulWallToUtc(y, m, d, h, mi) {
  const wall = Date.UTC(y, m - 1, d, h, mi);
  let utc = wall - seoulOffsetMs(wall);
  utc = wall - seoulOffsetMs(utc);
  return utc;
}
const parts = (ms) => {
  const t = new Date(ms);
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes()];
};
const pad = (n) => String(n).padStart(2, '0');

const pillar = (gz) => {
  const stem = gz[0];
  const branch = gz[1];
  return {
    stem, branch,
    stemKo: STEM_KO[stem], branchKo: BRANCH_KO[branch],
    stemElement: STEM_ELEMENT[stem], branchElement: BRANCH_ELEMENT[branch],
    stemYang: STEM_YANG(stem), branchYang: BRANCH_YANG[branch],
  };
};
export const ganzhiKo = (gz) => STEM_KO[gz[0]] + BRANCH_KO[gz[1]];

export class SajuInputError extends Error {}

// 입력 검사 + 정규화. 서버에서도 같은 함수로 다시 검사한다.
export function normalizeInput(raw) {
  const int = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
  const calendar = raw?.calendar === 'lunar' ? 'lunar' : 'solar';
  const year = int(raw?.year);
  const month = int(raw?.month);
  const day = int(raw?.day);
  const leap = calendar === 'lunar' && raw?.leap === true;
  const timeKnown = raw?.timeKnown !== false;
  const hour = timeKnown ? int(raw?.hour) : 12;
  const minute = timeKnown ? int(raw?.minute ?? 0) : 0;
  const gender = raw?.gender === 'female' ? 'female' : raw?.gender === 'male' ? 'male' : null;
  const city = CITIES.find((c) => c.id === raw?.city) ? raw.city : 'seoul';

  if (![year, month, day, hour, minute].every(Number.isInteger)) throw new SajuInputError('생년월일을 숫자로 입력해 주세요.');
  // 태어난 해는 1900년부터 올해까지 (미래 날짜는 받지 않음)
  const now = new Date();
  const thisYear = now.getFullYear();
  if (year < 1900 || year > thisYear) throw new SajuInputError(`1900년부터 ${thisYear}년 사이로 입력해 주세요.`);
  if (month < 1 || month > 12) throw new SajuInputError('월을 다시 확인해 주세요.');
  if (day < 1 || day > (calendar === 'lunar' ? 30 : 31)) throw new SajuInputError('일을 다시 확인해 주세요.');
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new SajuInputError('태어난 시각을 다시 확인해 주세요.');
  if (!gender) throw new SajuInputError('성별을 골라 주세요. 대운의 방향을 정하는 데 써요.');
  if (calendar === 'solar') {
    const t = new Date(Date.UTC(year, month - 1, day));
    if (t.getUTCMonth() !== month - 1) throw new SajuInputError('없는 날짜예요. 날짜를 다시 확인해 주세요.');
    if (t > Date.UTC(thisYear, now.getMonth(), now.getDate())) throw new SajuInputError('아직 오지 않은 날짜예요. 태어난 날짜를 확인해 주세요.');
  }
  return { calendar, year, month, day, leap, timeKnown, hour, minute, gender, city };
}

// 만 나이 (음력 입력은 양력 생일로 바꿔 계산). 날짜가 잘못됐으면 null
export function manAge(input, now = new Date()) {
  try {
    const [y, m, d] = toSolarDate(normalizeInput(input));
    const passed = now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
    const age = now.getFullYear() - y - (passed ? 0 : 1);
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

// 양력 날짜로 변환 (음력 입력이면 변환, 윤달 확인)
function toSolarDate(inp) {
  if (inp.calendar === 'solar') return [inp.year, inp.month, inp.day];
  let s;
  try {
    const l = Lunar.fromYmd(inp.year, inp.leap ? -inp.month : inp.month, inp.day);
    s = l.getSolar();
    // 존재하지 않는 음력 날짜(예: 작은달 30일)는 라이브러리가 다음 달로 넘기므로 되돌려 확인
    const back = s.getLunar();
    if (back.getYear() !== inp.year || Math.abs(back.getMonth()) !== inp.month || back.getDay() !== inp.day || (back.getMonth() < 0) !== inp.leap) {
      throw new Error('mismatch');
    }
  } catch {
    throw new SajuInputError(inp.leap ? '그해에는 그 윤달이 없어요. 음력 날짜를 다시 확인해 주세요.' : '없는 음력 날짜예요. 다시 확인해 주세요.');
  }
  return [s.getYear(), s.getMonth(), s.getDay()];
}

export function computeSaju(rawInput, { now = new Date() } = {}) {
  const inp = normalizeInput(rawInput);
  const [sy, sm, sd] = toSolarDate(inp);
  const utc = seoulWallToUtc(sy, sm, sd, inp.hour, inp.minute);
  const city = CITIES.find((c) => c.id === inp.city);

  // 연·월주: 절기 기준 시각(UTC+8)
  const [jy, jm, jd, jh, jmi] = parts(utc + 8 * 3600_000);
  const jieqiLunar = Solar.fromYmdHms(jy, jm, jd, jh, jmi, 0).getLunar();
  const jieqiEc = jieqiLunar.getEightChar();
  jieqiEc.setSect(1);

  // 일·시주: 지방 평균태양시 (보정 안 함이면 입력 시각)
  const localMs = city.lon == null ? Date.UTC(sy, sm - 1, sd, inp.hour, inp.minute) : Math.round((utc + city.lon * 4 * 60_000) / 60_000) * 60_000;
  const [ly, lm, ld, lh, lmi] = parts(localMs);
  const localEc = Solar.fromYmdHms(ly, lm, ld, lh, lmi, 0).getLunar().getEightChar();
  localEc.setSect(1); // 23시(지방시) 이후는 다음 날 일주 — 조·야자시를 나누지 않는 방식

  const pillars = {
    year: pillar(jieqiEc.getYear()),
    month: pillar(jieqiEc.getMonth()),
    day: pillar(localEc.getDay()),
    hour: inp.timeKnown ? pillar(localEc.getTime()) : null,
  };
  const dayStem = pillars.day.stem;

  for (const [key, p] of Object.entries(pillars)) {
    if (!p) continue;
    p.stemGod = key === 'day' ? '일간' : tenGod(dayStem, p.stemElement, p.stemYang);
    p.branchGod = tenGod(dayStem, p.branchElement, p.branchYang);
    p.hidden = HIDDEN[p.branch].map((s) => ({ stem: s, stemKo: STEM_KO[s], element: STEM_ELEMENT[s], god: tenGod(dayStem, STEM_ELEMENT[s], STEM_YANG(s)) }));
    p.stage = twelveStage(dayStem, p.branch);
  }

  // 오행 분포 (천간·지지 글자 수 기준)
  const elements = Object.fromEntries(ELEMENTS.map((e) => [e, 0]));
  for (const p of Object.values(pillars)) {
    if (!p) continue;
    elements[p.stemElement] += 1;
    elements[p.branchElement] += 1;
  }

  // 십성 분포 (일간 제외, 천간 + 지지 본기)
  const gods = {};
  for (const p of Object.values(pillars)) {
    if (!p) continue;
    if (p.stemGod !== '일간') gods[p.stemGod] = (gods[p.stemGod] || 0) + 1;
    gods[p.branchGod] = (gods[p.branchGod] || 0) + 1;
  }

  // 대운
  const yun = jieqiEc.getYun(inp.gender === 'male' ? 1 : 0);
  const birthYear = sy;
  const daeun = yun
    .getDaYun(11)
    .slice(1)
    .map((d) => ({ ganzhi: d.getGanZhi(), ko: ganzhiKo(d.getGanZhi()), startAge: d.getStartYear() - birthYear, startYear: d.getStartYear(), endYear: d.getEndYear() }));
  const thisYear = now.getFullYear();
  const currentDaeun = daeun.find((d) => thisYear >= d.startYear && thisYear <= d.endYear) || null;


  const lunarOfBirth = Solar.fromYmd(sy, sm, sd).getLunar();
  return {
    input: inp,
    solarDate: `${sy}-${pad(sm)}-${pad(sd)}`,
    lunarDate: `${lunarOfBirth.getYear()}-${pad(Math.abs(lunarOfBirth.getMonth()))}-${pad(lunarOfBirth.getDay())}${lunarOfBirth.getMonth() < 0 ? ' (윤달)' : ''}`,
    localTime: inp.timeKnown ? `${ly}-${pad(lm)}-${pad(ld)} ${pad(lh)}:${pad(lmi)}` : null,
    cityName: city.name,
    animal: BRANCH_ANIMAL[pillars.year.branch],
    pillars,
    dayMaster: { stem: dayStem, ko: STEM_KO[dayStem], element: STEM_ELEMENT[dayStem], yang: STEM_YANG(dayStem) },
    elements,
    gods,
    daeun,
    daeunStart: { years: yun.getStartYear(), months: yun.getStartMonth(), forward: yun.isForward() },
    currentDaeun,
    seun: seunOf(dayStem, thisYear),
    nextSeun: seunOf(dayStem, thisYear + 1), // 신년운세용 (내년)
  };
}

// 세운(그해의 간지): 입춘 이후 기준이라 그해 7월 1일의 연주로 정한다
function seunOf(dayStem, year) {
  const gz = Solar.fromYmd(year, 7, 1).getLunar().getYearInGanZhiExact();
  return { year, ganzhi: gz, ko: ganzhiKo(gz), stemGod: tenGod(dayStem, STEM_ELEMENT[gz[0]], STEM_YANG(gz[0])), branchGod: tenGod(dayStem, BRANCH_ELEMENT[gz[1]], BRANCH_YANG[gz[1]]) };
}

// 하루 운세(오늘·내일·지정일): 그날의 일진·월건·세운과 내 일간의 관계 (2026-11-13)
// ymd: 'YYYY-MM-DD' (양력). 일진은 자정 기준(만세력 일주와 같음)
export function dayLuck(c, ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const l = Solar.fromYmd(y, m, d).getLunar();
  const ds = c.dayMaster.stem;
  const info = (gz) => ({ ganzhi: gz, ko: ganzhiKo(gz), stemGod: tenGod(ds, STEM_ELEMENT[gz[0]], STEM_YANG(gz[0])), branchGod: tenGod(ds, BRANCH_ELEMENT[gz[1]], BRANCH_YANG[gz[1]]) });
  const daeun = c.daeun.find((x) => y >= x.startYear && y <= x.endYear) || null;
  return { date: ymd, day: info(l.getDayInGanZhi()), month: info(l.getMonthInGanZhiExact()), year: info(l.getYearInGanZhiExact()), daeun, lunar: `음력 ${Math.abs(l.getMonth())}월 ${l.getDay()}일` };
}
export function dayLuckSummary(x) {
  const g = (v) => `${v.ganzhi}(${v.ko}) — 천간 ${v.stemGod}, 지지 ${v.branchGod}`;
  return [
    `보는 날: ${x.date} (${x.lunar})`,
    `그날의 일진(日辰): ${g(x.day)}`,
    `그달의 월건: ${g(x.month)}`,
    `그해의 세운: ${g(x.year)}`,
    `그때의 대운: ${x.daeun ? `${x.daeun.ko}(${x.daeun.startYear}~${x.daeun.endYear})` : '대운 시작 전'}`,
  ].join('\n');
}

// 풀이 모델에 넘길 요약 (계산 결과만, 개인 식별 정보 없음)
export function chartSummary(c) {
  const order = [['년주', c.pillars.year], ['월주', c.pillars.month], ['일주', c.pillars.day], ['시주', c.pillars.hour]];
  const lines = order.map(([name, p]) =>
    p
      ? `${name}: ${p.stem}${p.branch}(${p.stemKo}${p.branchKo}) — 천간 ${ELEMENT_KO[p.stemElement]}·${p.stemGod}, 지지 ${ELEMENT_KO[p.branchElement]}·${p.branchGod}, 지장간 ${p.hidden.map((h) => h.stemKo).join('')}, 12운성 ${p.stage}`
      : `${name}: 모름(태어난 시각 모름)`
  );
  const el = ELEMENTS.map((e) => `${ELEMENT_KO[e]} ${c.elements[e]}`).join(', ');
  const gods = Object.entries(c.gods).map(([k, v]) => `${k} ${v}`).join(', ');
  const dm = c.dayMaster;
  return [
    `성별: ${c.input.gender === 'male' ? '남' : '여'}`,
    `양력 출생연도: ${c.solarDate.slice(0, 4)} (띠: ${c.animal})`,
    `일간: ${dm.stem}(${dm.ko}) ${dm.yang ? '양' : '음'}${ELEMENT_KO[dm.element]}`,
    ...lines,
    `오행 분포(천간·지지 ${c.pillars.hour ? 8 : 6}글자): ${el}`,
    `십성 분포(천간·지지 본기): ${gods}`,
    `대운(${c.daeunStart.forward ? '순행' : '역행'}, 만 나이): ${c.daeun.map((d) => `${d.startAge}세 ${d.ko}`).join(', ')}`,
    `현재 대운: ${c.currentDaeun ? `${c.currentDaeun.ko}(${c.currentDaeun.startYear}~${c.currentDaeun.endYear})` : '대운 시작 전'}`,
    (() => { const y = c.nextSeun.year; const d = c.daeun.find((x) => y >= x.startYear && y <= x.endYear); return `${y}년의 대운: ${d ? `${d.ko}(${d.startYear}~${d.endYear})` : '대운 시작 전'}`; })(),
    ...[c.seun, c.nextSeun].map((y) => `${y.year}년 세운: ${y.ganzhi}(${y.ko}) — 천간 ${y.stemGod}, 지지 ${y.branchGod}`),
  ].join('\n');
}
