// 스마트로페이 일반결제(대표인증) 연동 (2026-11-18) — 매뉴얼 https://manual.smartropay.co.kr/module.do
// 환경 변수: SMARTRO_MID(상점 번호), SMARTRO_MERCHANT_KEY(상점키, Secret), SMARTRO_MODE(STG = 테스트 / REAL = 운영)
// 흐름: /api/pay/order 가 주문 + EncryptData 를 만들어 줌 → 화면이 스마트로 결제창(tranMgr 폼) → 인증이 끝나면 스마트로가
//       ReturnUrl(/api/pay/smartro/return)로 Tid·TrAuthKey 를 POST → 서버가 승인 API 호출 + SignValue 검증 → 금전 적립 → /wallet 로 보냄
import { createHash } from 'node:crypto';

export function smartroEnv() {
  const mid = process.env.SMARTRO_MID || '';
  const key = process.env.SMARTRO_MERCHANT_KEY || '';
  const mode = (process.env.SMARTRO_MODE || 'STG').toUpperCase() === 'REAL' ? 'REAL' : 'STG';
  return { mid, key, mode, ready: Boolean(mid && key) };
}

const sha64 = (s) => createHash('sha256').update(s, 'utf8').digest('base64');

// EdiDate: 한국 시각 YYYYMMDDHHmmss
export function ediDate(d = new Date()) {
  const k = new Date(d.getTime() + 9 * 3600e3).toISOString();
  return k.slice(0, 19).replace(/[-T:]/g, '');
}
// 결제 요청 위변조 방지: Base64(SHA256(EdiDate + Mid + Amt + 상점키))
export const encryptData = (edi, mid, amt, key) => sha64(`${edi}${mid}${amt}${key}`);
// 결제 결과 위변조 검증: Base64(SHA256(Tid[0:10] + ResultCode + Tid[10:15] + 상점키 + Tid[15:]))
export function signOk(res, key) {
  const tid = String(res?.Tid || '');
  if (!tid || !res?.SignValue) return false;
  const want = sha64(`${tid.slice(0, 10)}${res.ResultCode}${tid.slice(10, 15)}${key}${tid.slice(15)}`);
  return want === String(res.SignValue);
}

const APPROVAL = { STG: 'https://tapproval.smartropay.co.kr', REAL: 'https://approval.smartropay.co.kr' };
// 승인 요청 (TrAuthKey 는 10분 안에 써야 함). 응답을 못 받으면 승인 결과 재요청(approvalInquiry.do)으로 한 번 더 물어봄
export async function approve(mode, Tid, TrAuthKey) {
  const call = (p) =>
    fetch(`${APPROVAL[mode]}/payment/approval/${p}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ Tid, TrAuthKey }),
      signal: AbortSignal.timeout(25_000),
    })
      .then((r) => r.json())
      .catch(() => null);
  return (await call('urlCallApproval.do')) || (await call('approvalInquiry.do'));
}

// 성공 결과 코드 — 통합코드조회 https://manual.smartropay.co.kr/code.do (2026-11-19 카카오페이 KP00 을 실패로 본 문제 고침)
//   카드·애플페이 3001, 계좌이체 4000, 휴대폰 A000, 카카오페이 KP00, 네이버페이 NP00, 페이코 PP00, L.PAY LP00, PINPAY PI00,
//   삼성페이·토스페이·스마일페이·티머니페이 0000. 가상계좌는 쓰지 않음(2026-11-19 사용자 결정 — 카드·간편결제만)
//   (SignValue·주문 금액·Mid 를 따로 확인하므로 0000 을 넣어도 안전)
export const PAID_CODES = new Set(['3001', '4000', 'A000', 'KP00', 'NP00', 'PP00', 'LP00', 'PI00', '0000']);
