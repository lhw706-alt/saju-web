// 일주 캐릭터 60종 (2026-11-19 사용자 지시 — 리텐션 기능 ①) — AI 없이 고정 글. 천간 10(타고난 결) × 지지 12(그 결이 놓인 계절·띠)를 엮어 만든다.
// 별명 = '<지지 장면>의 <천간 모습>' (예: 한겨울 밤의 큰 나무). 잘 맞는 일주 = 천간합 짝 + 육합 짝 지지와 그 삼합 친구 지지.
// 화면: src/pages/Iljoo.jsx. 흔히 쓰는 일주 해석을 쉬운 말로 줄인 것이고 사람을 단정하지 않는다(화면에 밝힘).
import { STEMS, BRANCHES } from './saju.js';

export const STEM_INFO = {
  甲: { ko: '갑', el: 'wood', image: '큰 나무', desc: '곧게 자라는 큰 나무처럼 뜻이 굵고 앞장서는 힘이 있어요.', good: '목표가 생기면 끝까지 밀고 가요.', care: '굽히는 걸 어려워해서 가끔 혼자 버티기도 해요.' },
  乙: { ko: '을', el: 'wood', image: '덩굴꽃', desc: '덩굴꽃처럼 부드럽지만 끈질기고, 사람 사이를 잘 이어요.', good: '어디서든 길을 찾아 자리를 잡아요.', care: '눈치를 많이 봐서 속마음을 늦게 꺼내요.' },
  丙: { ko: '병', el: 'fire', image: '한낮의 해', desc: '한낮의 해처럼 밝고 시원시원해서 숨김이 없어요.', good: '주변 분위기를 단번에 환하게 바꿔요.', care: '마음이 앞서 말이 먼저 나갈 때가 있어요.' },
  丁: { ko: '정', el: 'fire', image: '등불', desc: '밤을 밝히는 등불처럼 따뜻하고 섬세해요.', good: '한 사람을 깊이 살피고 오래 아껴요.', care: '혼자 마음을 태우며 지칠 때가 있어요.' },
  戊: { ko: '무', el: 'earth', image: '큰 산', desc: '큰 산처럼 듬직해서 쉽게 흔들리지 않아요.', good: '사람들이 기대고 싶어 하는 믿음을 줘요.', care: '바꿔야 할 때도 그대로 버티기 쉬워요.' },
  己: { ko: '기', el: 'earth', image: '너른 밭', desc: '너른 밭처럼 품이 넓고 실속을 챙겨요.', good: '사람과 일을 차근차근 길러 내요.', care: '걱정이 많아 결정을 미룰 때가 있어요.' },
  庚: { ko: '경', el: 'metal', image: '바위', desc: '단단한 바위처럼 결단이 빠르고 의리가 있어요.', good: '맺고 끊음이 분명해서 일을 깔끔하게 끝내요.', care: '말이 곧아서 의도보다 세게 들릴 수 있어요.' },
  辛: { ko: '신', el: 'metal', image: '보석', desc: '잘 다듬은 보석처럼 섬세하고 기준이 높아요.', good: '작은 차이를 알아보는 감각이 뛰어나요.', care: '스스로에게 엄격해서 쉽게 만족하지 못해요.' },
  壬: { ko: '임', el: 'water', image: '큰 바다', desc: '큰 바다처럼 생각이 깊고 넓어 흐름을 잘 읽어요.', good: '큰 그림을 보고 판을 짜는 데 강해요.', care: '생각이 많아 실행이 늦어질 때가 있어요.' },
  癸: { ko: '계', el: 'water', image: '이슬비', desc: '이슬비처럼 조용히 스며드는 지혜와 감수성이 있어요.', good: '사람 마음을 잘 알아채고 부드럽게 도와요.', care: '감정이 쌓이면 혼자 가라앉기 쉬워요.' },
};

export const BRANCH_INFO = {
  子: { ko: '자', animal: '쥐', scene: '한겨울 밤', trait: '재치와 밤에 빛나는 직관' },
  丑: { ko: '축', animal: '소', scene: '새벽 눈밭', trait: '묵묵한 끈기' },
  寅: { ko: '인', animal: '호랑이', scene: '이른 봄 숲', trait: '두려움 없는 용기' },
  卯: { ko: '묘', animal: '토끼', scene: '봄 정원', trait: '다정한 감각' },
  辰: { ko: '진', animal: '용', scene: '봄비 내리는 연못', trait: '큰 꿈과 변화의 힘' },
  巳: { ko: '사', animal: '뱀', scene: '초여름 아침', trait: '날카로운 통찰' },
  午: { ko: '오', animal: '말', scene: '한여름 낮', trait: '뜨거운 열정과 속도' },
  未: { ko: '미', animal: '양', scene: '늦여름 들판', trait: '온화한 배려' },
  申: { ko: '신', animal: '원숭이', scene: '가을 산', trait: '재주와 임기응변' },
  酉: { ko: '유', animal: '닭', scene: '가을 저녁', trait: '꼼꼼한 자기 관리' },
  戌: { ko: '술', animal: '개', scene: '늦가을 노을', trait: '든든한 의리와 책임감' },
  亥: { ko: '해', animal: '돼지', scene: '초겨울 호수', trait: '너그러운 여유' },
};

const STEM_PAIR = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
const BRANCH_PAIR = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const TRINE = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'];

// 받침이 있으면 '이', 없으면 '가'
const josa = (w) => ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? '이' : '가');

// 60갑자 순서
export const ILJOO_LIST = Array.from({ length: 60 }, (_, i) => STEMS[i % 10] + BRANCHES[i % 12]);
const valid = (gz) => ILJOO_LIST.includes(gz);

// '甲子' 또는 '갑자' → '甲子'
export function toIljoo(s) {
  const v = String(s || '').trim();
  if (valid(v)) return v;
  const st = Object.keys(STEM_INFO).find((k) => STEM_INFO[k].ko === v[0]);
  const br = Object.keys(BRANCH_INFO).find((k) => BRANCH_INFO[k].ko === v[1]);
  return st && br && valid(st + br) ? st + br : null;
}

export function iljooInfo(gz) {
  const s = STEM_INFO[gz[0]];
  const b = BRANCH_INFO[gz[1]];
  const ps = STEM_PAIR[gz[0]];
  const pb = BRANCH_PAIR[gz[1]];
  const trine = TRINE.find((t) => t.includes(pb)) || '';
  const matches = [pb, ...trine.split('').filter((x) => x !== pb)].map((br) => ps + br).filter(valid).slice(0, 3);
  return {
    gz,
    ko: s.ko + b.ko,
    el: s.el,
    animal: b.animal,
    nickname: `${b.scene}의 ${s.image}`,
    intro: `${s.desc} 여기에 ${b.animal}의 ${b.trait}${josa(b.trait)} 더해진 일주예요.`,
    good: s.good,
    care: s.care,
    matches,
  };
}

// 이 브라우저의 일주 도감 (본 일주 모음) — localStorage saju:iljoo-book = { mine, seen: [gz…] }
const KEY = 'saju:iljoo-book';
export function loadBook() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { mine: valid(v.mine) ? v.mine : null, seen: Array.isArray(v.seen) ? v.seen.filter(valid) : [] };
  } catch {
    return { mine: null, seen: [] };
  }
}
export function addToBook(gz, { mine = false } = {}) {
  if (!valid(gz)) return loadBook();
  const b = loadBook();
  const next = { mine: mine ? gz : b.mine, seen: b.seen.includes(gz) ? b.seen : [...b.seen, gz] };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}
