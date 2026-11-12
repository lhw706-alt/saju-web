// 풀이 주제 (화면과 서버 함수가 함께 사용)
// year: 'next' 이면 서버가 내년 세운을 기준 연도로 넘긴다 (신년운세).
export const NEXT_YEAR = new Date().getFullYear() + 1;

export const TOPICS = [
  { id: 'overall', label: '타고난 성향', desc: '일간과 오행 균형으로 본 기질과 강점', focus: '타고난 기질, 강점과 약점, 오행 균형이 성격에 주는 영향, 잘 맞는 생활 방식' },
  { id: 'newyear', label: `${NEXT_YEAR} 신년운세`, desc: `${NEXT_YEAR}년 한 해의 흐름과 계절마다 운`, year: 'next', focus: `${NEXT_YEAR}년 세운과 그해의 대운이 원국과 어떻게 만나는지, 봄·여름·가을·겨울 계절별 흐름, 그해 힘을 쓰면 좋은 일과 조심할 일` },
  { id: 'year', label: '올해 운세', desc: '올해 세운과 지금 대운의 흐름', focus: '올해 세운과 현재 대운이 원국과 어떻게 만나는지, 상반기·하반기 흐름, 올해 힘을 쓰면 좋은 일과 조심할 일' },
  { id: 'love', label: '연애·관계', desc: '관계에서 드러나는 모습과 인연의 흐름', focus: '관계에서의 성향, 잘 맞는 사람의 기질, 관계에서 조심할 습관, 대운·세운으로 본 인연의 흐름' },
  { id: 'money', label: '재물', desc: '돈을 모으고 쓰는 방식', focus: '재성·식상 구조로 본 돈을 버는 방식과 쓰는 습관, 재물운이 강해지는 시기, 지출 관리에서 조심할 점' },
  { id: 'career', label: '직업·적성', desc: '일하는 방식과 어울리는 분야', focus: '관성·인성·식상 구조로 본 일하는 방식, 어울리는 직무와 환경, 커리어 전환에 유리한 시기' },
];

export const topicById = (id) => TOPICS.find((t) => t.id === id) || null;
