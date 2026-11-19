// 문자 보내기 — 솔라피(SOLAPI) API (2026-11-19, 결제 전 휴대폰 인증용)
// 환경 변수: SOLAPI_API_KEY, SOLAPI_API_SECRET(Secret), SMS_FROM(솔라피에 등록한 발신번호, 숫자만 — 예: 07079543670)
// 인증: Authorization: HMAC-SHA256 apiKey=…, date=ISO8601, salt=무작위, signature=hex(HMAC-SHA256(API Secret, date + salt))
import { createHmac, randomBytes } from 'node:crypto';

export function smsEnv() {
  const key = process.env.SOLAPI_API_KEY || '';
  const secret = process.env.SOLAPI_API_SECRET || '';
  const from = String(process.env.SMS_FROM || '').replace(/[^0-9]/g, '');
  return { key, secret, from, ready: Boolean(key && secret && from) };
}

export async function sendSms(to, text) {
  const env = smsEnv();
  if (!env.ready) throw new Error('sms-not-ready');
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', env.secret).update(date + salt).digest('hex');
  const r = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      authorization: `HMAC-SHA256 apiKey=${env.key}, date=${date}, salt=${salt}, signature=${signature}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ message: { to, from: env.from, text } }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  const d = await r?.json().catch(() => null);
  if (!r?.ok) throw new Error(`sms-failed:${d?.errorCode || r?.status || 'network'}`);
  return d;
}
