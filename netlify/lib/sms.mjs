// 문자 보내기 — 솔라피(SOLAPI) API (2026-11-19, 결제 전 휴대폰 인증용)
// 환경 변수: SOLAPI_API_KEY, SOLAPI_API_SECRET(Secret), SMS_FROM(솔라피에 등록한 발신번호, 하이픈 없이 숫자만)
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
  const date = new Date().toISOString().replace(/.d{3}Z$/, 'Z'); // 문서 예시처럼 밀리초 없이
  const salt = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', env.secret).update(date + salt).digest('hex');
  const authorization = `HMAC-SHA256 apiKey=${env.key}, date=${date}, salt=${salt}, signature=${signature}`;
  const payload = { message: { to, from: env.from, text } };
  // 고정 IP 중계 (2026-11-19): 솔라피는 문자를 'API 키에 직접 적은 고정 IP'에서만 받는데 Netlify 함수는 나가는 IP가 계속 바뀜
  //   → SMS_RELAY_URL(https://sms.sajucheonmun.com/send)·SMS_RELAY_SECRET(Secret)이 있으면 AWS Lightsail 서울 서버(고정 IP)를 거쳐 보냄.
  //   중계 서버 설치는 relay/setup.sh. 솔라피 키는 Netlify 에만 있고, 중계 서버는 서명이 맞는 요청을 솔라피로 그대로 전달만 함.
  const relay = process.env.SMS_RELAY_URL || '';
  const relaySecret = process.env.SMS_RELAY_SECRET || '';
  let r;
  if (relay && relaySecret) {
    const body = JSON.stringify({ authorization, payload });
    const ts = Date.now();
    const sig = createHmac('sha256', relaySecret).update(`${ts}.${body}`).digest('hex');
    r = await fetch(relay, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-relay-ts': String(ts), 'x-relay-sig': sig },
      body,
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
  } else {
    r = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
  }
  const d = await r?.json().catch(() => null);
  if (!r?.ok) {
    const e = new Error(`sms-failed:${d?.errorCode || r?.status || 'network'}`);
    e.code = String(d?.errorCode || r?.status || 'network').slice(0, 40);
    e.detail = String(d?.errorMessage || '').slice(0, 80);
    throw e;
  }
  return d;
}
