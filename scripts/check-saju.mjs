// 만세력 계산 점검: npm test
import { computeSaju, chartSummary } from '../src/lib/saju.js';

let fail = 0;
function expect(name, actual, wanted) {
  const ok = actual === wanted;
  if (!ok) fail += 1;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${actual}${ok ? '' : ` (기대값 ${wanted})`}`);
}
const gz = (p) => (p ? p.stem + p.branch : '-');
const run = (inp) => computeSaju({ gender: 'male', city: 'none', timeKnown: true, minute: 0, ...inp });

// 2000-01-01 일주는 戊午
expect('2000-01-01 일주', gz(run({ year: 2000, month: 1, day: 1, hour: 12 }).pillars.day), '戊午');

// 2024년 입춘: 2024-02-04 17:27 (한국 시각) 전후로 연주가 바뀜
expect('입춘 직전 연주', gz(run({ year: 2024, month: 2, day: 4, hour: 17, minute: 0 }).pillars.year), '癸卯');
expect('입춘 직후 연주', gz(run({ year: 2024, month: 2, day: 4, hour: 18, minute: 0 }).pillars.year), '甲辰');
expect('입춘 직후 월주', gz(run({ year: 2024, month: 2, day: 4, hour: 18, minute: 0 }).pillars.month), '丙寅');

// 경도 보정: 서울 00:20 출생은 지방시 전날 23:48 → 자시, 일주는 다음 날 기준(조자시 통일)과 같음
const a = run({ year: 1995, month: 3, day: 10, hour: 0, minute: 20, city: 'seoul' });
expect('서울 경도 보정 지방시', a.localTime, '1995-03-09 23:48');
expect('보정 후 시지', a.pillars.hour.branch, '子');

// 서울 01:10 → 지방시 00:38 → 자시 (보정 없으면 축시)
expect('보정 시 01:10 시지', run({ year: 1995, month: 3, day: 10, hour: 1, minute: 10, city: 'seoul' }).pillars.hour.branch, '子');
expect('미보정 01:10 시지', run({ year: 1995, month: 3, day: 10, hour: 1, minute: 10 }).pillars.hour.branch, '丑');

// 1987년 서머타임(+1시간): 07:30 입력 → 실제 표준시 06:30 → 서울 지방시 05:58 → 묘시
expect('1987 서머타임 지방시', run({ year: 1987, month: 7, day: 1, hour: 7, minute: 30, city: 'seoul' }).localTime, '1987-07-01 05:58');

// 음력 입력: 1990년 윤5월 1일 = 양력 1990-06-23
expect('음력 윤달 변환', run({ calendar: 'lunar', leap: true, year: 1990, month: 5, day: 1, hour: 12 }).solarDate, '1990-06-23');
try {
  run({ calendar: 'lunar', leap: true, year: 1991, month: 5, day: 1, hour: 12 });
  expect('없는 윤달 거절', 'accepted', 'rejected');
} catch (e) {
  expect('없는 윤달 거절', 'rejected', 'rejected');
}

// 시각 모름 → 시주 없음, 오행 6글자
const u = run({ year: 1990, month: 5, day: 15, timeKnown: false });
expect('시각 모름 시주', u.pillars.hour, null);
expect('시각 모름 오행 합계', Object.values(u.elements).reduce((a, b) => a + b, 0), 6);

// 십성·12운성: 庚 일간
const c = run({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 });
expect('1990-05-15 사주', [c.pillars.year, c.pillars.month, c.pillars.day, c.pillars.hour].map(gz).join(' '), '庚午 辛巳 庚辰 癸未');
expect('년간 십성', c.pillars.year.stemGod, '비견');
expect('월간 십성', c.pillars.month.stemGod, '겁재');
expect('시간 십성', c.pillars.hour.stemGod, '상관');
expect('년지 12운성', c.pillars.year.stage, '목욕');
expect('년지 십성(午 본기 丁)', c.pillars.year.branchGod, '정관');
// 세운: 2027년 丁未 → 庚 일간 기준 천간 정관·지지 정인 (내년 세운은 신년운세에 씀)
const y27 = c.nextSeun.year === 2027 ? c.nextSeun : c.seun.year === 2027 ? c.seun : null;
if (y27) { expect('2027 세운', y27.ganzhi, '丁未'); expect('2027 세운 십성', y27.stemGod + '·' + y27.branchGod, '정관·정인'); }

// 입력 범위: 태어난 해는 올해까지, 아직 오지 않은 날짜는 받지 않음
const errOf = (inp) => {
  try {
    computeSaju(inp);
    return 'ok';
  } catch (e) {
    return e.message;
  }
};
const Y = new Date().getFullYear();
expect('내년 출생 거부', errOf({ calendar: 'solar', year: Y + 1, month: 1, day: 1, timeKnown: false, gender: 'male' }), `1900년부터 ${Y}년 사이로 입력해 주세요.`);
const tomorrow = new Date(Date.now() + 86400000);
if (tomorrow.getFullYear() === Y) {
  expect('내일 날짜 거부', errOf({ calendar: 'solar', year: Y, month: tomorrow.getMonth() + 1, day: tomorrow.getDate(), timeKnown: false, gender: 'male' }), '아직 오지 않은 날짜예요. 태어난 날짜를 확인해 주세요.');
}

console.log('\n' + chartSummary(c));
if (fail) {
  console.error(`\n${fail}개 실패`);
  process.exit(1);
}
console.log('\n모두 통과');
