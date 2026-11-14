// 글래스모피즘 아이콘 (2026-11-14 사용자 지시: 이모지 대신) — 색 번짐(--g1·--g2) 위에 반투명 유리판, 흰 선 아이콘.
// 이름 궁합·소원빌기·행운의 부적이 같이 씀. 스타일은 styles.css .glass-ic. 새 아이콘은 ICONS 에 선(24×24)과 색 두 개를 더한다.
const ICONS = {
  // 이름 궁합 관계
  lover: ['M9 19s-6-3.6-6-8.2A3.3 3.3 0 0 1 9 9a3.3 3.3 0 0 1 6 1.8M15 21s-5-3-5-6.8A2.7 2.7 0 0 1 15 12.6a2.7 2.7 0 0 1 5 1.6C20 18 15 21 15 21z', '#ff7a9a', '#ffb36b'],
  some: ['M12 20s-7-4.2-7-9.4A3.8 3.8 0 0 1 12 8.5a3.8 3.8 0 0 1 7 2.1C19 15.8 12 20 12 20zM19 3v3M17.5 4.5h3', '#ff8fb8', '#c9a0ff'],
  friend: ['M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 20c.6-3 2.8-5 5.5-5s4.9 2 5.5 5M12.5 16.2c.9-.8 2.1-1.2 3.5-1.2 2.7 0 4.9 2 5.5 5', '#ffc861', '#ff9a6b'],
  spouse: ['M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM9.5 9.6 8 6l2-3h4l2 3-1.5 3.6M8 6h8', '#b9a6ff', '#7fc8ff'],
  coworker: ['M4 8h16v11H4zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16', '#6fc6ff', '#7fe0c0'],
  etc: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z', '#ffd98a', '#e2c27a'],
  // 이름 궁합 소개
  pen: ['M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4', '#ffd98a', '#ff9a6b'],
  chart: ['M5 20V12M10 20V6M15 20v-9M20 20V4', '#7fc8ff', '#b9a6ff'],
  heart: ['M12 20s-7-4.2-7-9.4A3.8 3.8 0 0 1 12 8.5a3.8 3.8 0 0 1 7 2.1C19 15.8 12 20 12 20z', '#ff7a9a', '#ffb36b'],
  // 소원·부적 종류
  love: ['M12 20s-7-4.2-7-9.4A3.8 3.8 0 0 1 12 8.5a3.8 3.8 0 0 1 7 2.1C19 15.8 12 20 12 20z', '#ff7a9a', '#ffb36b'],
  money: ['M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9.5 13.5c0 1.2 1.1 2 2.5 2s2.5-.7 2.5-1.8c0-2.6-5-1.5-5-4 0-1 1-1.8 2.5-1.8s2.5.8 2.5 1.8M12 6.8v1.4M12 15.6V17', '#ffd36b', '#f0a14a'],
  career: ['M4 8h16v11H4zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16', '#6fc6ff', '#7f9bff'],
  health: ['M12 20c-5-3-7-6.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 3.5-2 7-7 10zM12 9.5v5M9.5 12h5', '#7fe0a0', '#5ec4c0'],
  study: ['M4 6.5C6.5 5 9.5 5 12 6.5 14.5 5 17.5 5 20 6.5V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0zM12 6.5V19', '#b9a6ff', '#ff9ec7'],
  luck: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z', '#ffd98a', '#e2c27a'],
  // 소원빌기 화면
  sky: ['M4 19h16M7 15l2-6 3 4 2-3 3 5M17 6.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z', '#8fb4ff', '#c9a0ff'],
  box: ['M4 8l8-4 8 4v9l-8 4-8-4zM4 8l8 4 8-4M12 12v9', '#ffd98a', '#e2c27a'],
  done: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.7 2.7L16 9.8', '#7fe0a0', '#5ec4c0'],
};
export const glassPath = (kind) => (ICONS[kind] || ICONS.etc)[0];

export default function GlassIcon({ kind, path, size = 'md' }) {
  const [d, g1, g2] = ICONS[kind] || ICONS.etc;
  return (
    <span className={`glass-ic is-${size}`} style={{ '--g1': g1, '--g2': g2 }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={path || d} />
      </svg>
    </span>
  );
}

// 유리판 없이 선 아이콘만 (작은 칩 등)
export function LineIcon({ kind, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={glassPath(kind)} />
    </svg>
  );
}
