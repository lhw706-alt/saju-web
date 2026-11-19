#!/usr/bin/env bash
# 사주천문 문자 중계 서버 설치 (2026-11-19) — AWS Lightsail 서울 · Ubuntu 에서 한 번 실행
# 하는 일: Node.js + Caddy(HTTPS 자동) 설치 → 중계 프로그램(/opt/sms-relay/relay.mjs) 설치 → 서비스 등록 → 비밀키 만들어 출력
# 구조: Netlify 함수 ─(HTTPS + HMAC 서명)→ https://sms.sajucheonmun.com/send ─→ api.solapi.com (이 서버의 고정 IP 에서 나감)
# 이 서버에는 솔라피 키를 두지 않아요. Netlify 가 만든 솔라피 인증 헤더를 그대로 전달만 하고, 솔라피 주소 말고는 어디로도 보내지 않아요.
set -euo pipefail
DOMAIN="${1:-sms.sajucheonmun.com}"

sudo apt-get update -y
sudo apt-get install -y nodejs debian-keyring debian-archive-keyring apt-transport-https curl gnupg openssl
# Caddy 공식 설치 저장소 (https://caddyserver.com/docs/install#debian-ubuntu-raspbian)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update -y
sudo apt-get install -y caddy

NODE_MAJOR=$(node -v | sed "s/v([0-9]*).*//")
if [ "$NODE_MAJOR" -lt 18 ]; then echo "Node.js 18 이상이 필요해요(지금 $(node -v)). Ubuntu 24.04 로 서버를 만들어 주세요."; exit 1; fi

sudo mkdir -p /opt/sms-relay
sudo tee /opt/sms-relay/relay.mjs >/dev/null <<'JS'
// 문자 중계: POST /send {authorization, payload} + 헤더 x-relay-ts·x-relay-sig(HMAC-SHA256(비밀키, ts + "." + 본문))
// 서명이 맞고 2분 안의 요청만 솔라피 문자 API 로 그대로 전달. 내용은 저장·기록하지 않음.
import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
const SECRET = process.env.RELAY_SECRET || '';
const SOLAPI = 'https://api.solapi.com/messages/v4/send';
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
  if (req.method !== 'POST' || req.url !== '/send' || !SECRET) return send(res, 404, { error: 'not-found' });
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 8192) req.destroy(); });
  req.on('end', async () => {
    const ts = Number(req.headers['x-relay-ts'] || 0);
    const sig = String(req.headers['x-relay-sig'] || '');
    const want = createHmac('sha256', SECRET).update(`${ts}.${body}`).digest('hex');
    const ok = sig.length === want.length && timingSafeEqual(Buffer.from(sig), Buffer.from(want)) && Math.abs(Date.now() - ts) < 120000;
    if (!ok) return send(res, 401, { error: 'bad-signature' });
    let msg;
    try { msg = JSON.parse(body); } catch { return send(res, 400, { error: 'bad-json' }); }
    if (typeof msg.authorization !== 'string' || !msg.payload) return send(res, 400, { error: 'bad-request' });
    try {
      const r = await fetch(SOLAPI, { method: 'POST', headers: { authorization: msg.authorization, 'content-type': 'application/json' }, body: JSON.stringify(msg.payload), signal: AbortSignal.timeout(10000) });
      res.writeHead(r.status, { 'content-type': 'application/json' });
      res.end(await r.text());
    } catch {
      send(res, 502, { errorCode: 'relay-network', errorMessage: '중계 서버가 솔라피에 연결하지 못했어요.' });
    }
  });
}).listen(8080, '127.0.0.1');
JS

if [ ! -f /etc/sms-relay.env ]; then
  echo "RELAY_SECRET=$(openssl rand -hex 32)" | sudo tee /etc/sms-relay.env >/dev/null
  sudo chmod 600 /etc/sms-relay.env
fi

sudo tee /etc/systemd/system/sms-relay.service >/dev/null <<UNIT
[Unit]
Description=Sajucheonmun SMS relay
After=network-online.target
[Service]
EnvironmentFile=/etc/sms-relay.env
ExecStart=/usr/bin/node /opt/sms-relay/relay.mjs
Restart=always
DynamicUser=yes
[Install]
WantedBy=multi-user.target
UNIT

sudo tee /etc/caddy/Caddyfile >/dev/null <<CADDY
${DOMAIN} {
	reverse_proxy 127.0.0.1:8080
}
CADDY

sudo systemctl daemon-reload
sudo systemctl enable --now sms-relay
sudo systemctl restart caddy

echo ""
echo "===== 설치 끝 ====="
echo "이 서버의 공개 IP(솔라피 'IP 직접 입력'에 넣을 값): $(curl -s https://checkip.amazonaws.com)"
echo "Netlify 환경 변수 SMS_RELAY_SECRET 에 넣을 값(Secret 체크):"
sudo cat /etc/sms-relay.env | cut -d= -f2
echo "확인: 잠시 뒤 브라우저에서 https://${DOMAIN}/health 를 열면 {\"ok\":true} 가 보여야 해요."
