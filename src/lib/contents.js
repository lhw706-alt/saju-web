// 메인 카드·상단 메뉴(GNB)에 함께 쓰는 콘텐츠 목록.
// status
//   live   — 지금 쓸 수 있음. topic 이 있으면 결과 화면에서 그 풀이 주제를 바로 시작한다.
//   soon   — 로그인 없이 만들 수 있지만 아직 안 만든 것 (클릭 시 '준비중')
//   login  — 기록 저장·회원 기능이 있어야 하는 것 (카카오 로그인 등 회원 기능이 생기면 연다)
//   hold   — 사이트 규칙(CLAUDE.md)과 부딪혀 보류: 이름을 받는 것, 얼굴 사진, 부적·살풀이
// glyph 는 카드 상징 한자, el 은 상징 색(오행).
import { NEXT_YEAR } from './topics.js';

export const GROUPS = [
  { id: 'saju', label: '사주' },
  { id: 'fortune', label: '운세' },
  { id: 'match', label: '궁합' },
  { id: 'luck', label: '행운' },
  { id: 'ask', label: '풀이' },
];

export const CONTENTS = [
  { id: 'life', group: 'saju', title: '평생 사주', desc: '타고난 성향부터 10년마다 바뀌는 대운까지', glyph: '命', el: 'earth', status: 'live', topic: 'overall' },
  { id: 'newyear', group: 'saju', title: `${NEXT_YEAR} 신년운세`, desc: '한 해의 흐름과 계절마다 운', glyph: '新', el: 'fire', status: 'live', topic: 'newyear', path: '/newyear' },
  { id: 'tojeong', group: 'saju', title: '토정비결', desc: '144괘로 보는 한 해와 달마다 운', glyph: '卦', el: 'earth', status: 'soon' },

  { id: 'today', group: 'fortune', title: '오늘의 운세', desc: '오늘 일진과 내 원국이 만나는 하루', glyph: '今', el: 'wood', status: 'live', topic: 'today' },
  { id: 'tomorrow', group: 'fortune', title: '내일의 운세', desc: '내일을 미리 준비하는 조언', glyph: '明', el: 'fire', status: 'live', topic: 'tomorrow' },
  { id: 'date', group: 'fortune', title: '지정일 운세', desc: '중요한 날, 그날의 기운 미리 보기', glyph: '日', el: 'metal', status: 'live', topic: 'date' },

  { id: 'tti', group: 'fortune', title: '오늘의 띠별 운세', desc: '입력 없이 바로 보는 12띠 오늘 운세', glyph: '支', el: 'earth', status: 'live', path: '/tti' },

  { id: 'match', group: 'match', title: '궁합', desc: '두 사람의 사주가 얼마나 잘 맞는지', glyph: '合', el: 'fire', status: 'live', topic: 'match' },
  { id: 'namematch', group: 'match', title: '이름 궁합', desc: '이름 두 개로 알아보는 우리 사이의 케미', glyph: '緣', el: 'wood', status: 'live', path: '/name-match' },

  { id: 'number', group: 'luck', title: '행운의 번호', desc: '천둥도사가 하루 한 번 뽑아 주는 6개의 숫자', glyph: '數', el: 'water', status: 'live', path: '/lucky' },
  { id: 'blessing', group: 'luck', title: '천생복덕운', desc: '타고난 복을 활용하는 방법', glyph: '福', el: 'earth', status: 'soon' },
  { id: 'moving', group: 'luck', title: '이사택일', desc: '한눈에 보는 이사하기 좋은 날', glyph: '移', el: 'wood', status: 'soon' },
  { id: 'wish', group: 'luck', title: '소원 빌기', desc: '소원을 하늘에 띄우고 서로 응원하기', glyph: '願', el: 'water', status: 'live', path: '/wish' },
  { id: 'charm', group: 'luck', title: '행운의 부적', desc: '지금 나에게 필요한 행운을 펼치기', glyph: '符', el: 'fire', status: 'live', path: '/talisman' },
  { id: 'sal', group: 'luck', title: '살풀이', desc: '원국의 살(煞), 겁내지 않고 이해하기', glyph: '解', el: 'metal', status: 'hold' },

  { id: 'ask', group: 'ask', title: '천둥도사에게 묻기', desc: '내 사주로 궁금한 걸 물어봐요', glyph: '問', el: 'water', status: 'soon' },
  { id: 'dream', group: 'ask', title: '꿈해몽', desc: '해몽 풀이에 내 사주를 더해서', glyph: '夢', el: 'water', status: 'soon' },
  { id: 'tarot', group: 'ask', title: '타로', desc: '카드를 골라 천둥도사에게 묻기', glyph: '牌', el: 'metal', status: 'live', path: '/tarot' },
  { id: 'psych', group: 'ask', title: '심리풀이', desc: '몇 가지 질문으로 보는 지금 내 마음', glyph: '心', el: 'fire', status: 'soon' },
  { id: 'name', group: 'ask', title: '이름풀이', desc: '내 이름에 담긴 뜻과 기운', glyph: '名', el: 'wood', status: 'hold' },
  { id: 'face', group: 'ask', title: '관상', desc: '얼굴에 적힌 운명 알아보기', glyph: '相', el: 'earth', status: 'hold' },
];

export const SOON_MESSAGE = {
  soon: '준비중이에요. 곧 열려요!',
  login: '준비중이에요. 로그인 기능과 함께 열려요.',
  hold: '준비중이에요.',
};
