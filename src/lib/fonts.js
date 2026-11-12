// 조선신명조 (조선일보 창간 100주년 기념 서체, 무료·웹 임베딩 허용 — 파일은 수정 없이 그대로 사용)
// 파일이 커서(약 2.9MB, 한자 포함) font-display: swap 으로 등록 → 받는 동안 기본 명조로 먼저 보여 줌.
import chosunSmUrl from '@noonnu/chosun-sm/fonts/chosunsm-normal.woff?url';

export const SERIF_FAMILY = 'ChosunSm';

export function loadFonts() {
  if (typeof document === 'undefined' || !('fonts' in document) || typeof FontFace === 'undefined') return;
  const face = new FontFace(SERIF_FAMILY, `url(${chosunSmUrl}) format('woff')`, { display: 'swap' });
  document.fonts.add(face);
  face.load().catch(() => {});
}
