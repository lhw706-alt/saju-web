// 활동 배지·레벨 (2026-11-14 리텐션 기획안 3번) — 서버가 회원의 활동 수를 세서(/api/badges) 여기 기준으로 얻은 배지를 정함.
// 배지는 금빛 원판 + 한자 문양(이모지 없음, 화면 src/pages/My.jsx '내 배지' 탭). 배지를 더하면 STAT 이름과 goal 만 정하면 됨.
export const BADGES = [
  { id: 'first', han: '始', name: '첫 풀이', desc: '사주나 운세 풀이를 처음 받았어요', stat: 'readings', goal: 1 },
  { id: 'streak3', han: '三', name: '사흘 연속', desc: '3일 연속으로 들렀어요', stat: 'bestStreak', goal: 3 },
  { id: 'streak7', han: '七', name: '이레 연속', desc: '7일 연속으로 들렀어요', stat: 'bestStreak', goal: 7 },
  { id: 'wish', han: '願', name: '첫 소원', desc: '하늘에 소원을 띄웠어요', stat: 'wishes', goal: 1 },
  { id: 'cheer5', han: '援', name: '응원단', desc: '다른 사람의 소원을 5번 응원했어요', stat: 'cheers', goal: 5 },
  { id: 'cheer30', han: '帥', name: '응원 대장', desc: '다른 사람의 소원을 30번 응원했어요', stat: 'cheers', goal: 30 },
  { id: 'done', han: '成', name: '소원 성취', desc: '소원이 이루어졌다고 표시했어요', stat: 'wishDone', goal: 1 },
  { id: 'charm7', han: '符', name: '부적 수집가', desc: '부적 도감에 7종을 모았어요', stat: 'charms', goal: 7 },
  { id: 'charm21', han: '道', name: '부적 도사', desc: '부적 도감 21종을 모두 모았어요', stat: 'charms', goal: 21 },
  { id: 'lucky', han: '數', name: '행운을 뽑다', desc: '행운의 번호를 처음 뽑았어요', stat: 'lucky', goal: 1 },
  { id: 'tarot', han: '牌', name: '카드를 펼치다', desc: '타로 카드를 처음 펼쳤어요', stat: 'tarot', goal: 1 },
];
// 레벨: 얻은 배지 수로
export const LEVELS = [
  { min: 0, name: '새내기 별' },
  { min: 2, name: '반짝이는 별' },
  { min: 4, name: '빛나는 별' },
  { min: 7, name: '은하수' },
  { min: 10, name: '천문의 주인' },
];
export function levelOf(earned) {
  let i = 0;
  LEVELS.forEach((l, k) => {
    if (earned >= l.min) i = k;
  });
  return { lv: i + 1, name: LEVELS[i].name, next: LEVELS[i + 1] || null };
}
export const badgeResult = (stats) => BADGES.map((b) => ({ ...b, now: Math.min(stats[b.stat] || 0, b.goal), earned: (stats[b.stat] || 0) >= b.goal }));
