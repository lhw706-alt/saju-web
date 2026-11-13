import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 이 컴퓨터의 미리보기(npm run dev) 전용 가짜 로그인 — 실제 사이트(빌드)에는 들어가지 않음.
// 로그인 서버(netlify/functions/auth.mjs)와 카카오 키가 Netlify 에만 있어서, 미리보기에서도 로그인한 화면을
// 확인할 수 있도록 /api/auth/* 를 흉내 냄. 상태는 미리보기 서버 메모리에만 (재시작하면 사라짐).
function devFakeLogin() {
  let loggedIn = false;
  let provider = 'kakao';
  let devPw = 'test1234';
  const devInqs = [];
  const devHist = {};
  let birth = null;
  let nick = '천동이(테스트)';
  const now = new Date().toISOString();
  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
  };
  const readBody = (req) =>
    new Promise((resolve) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        try {
          resolve(JSON.parse(raw || '{}'));
        } catch {
          resolve({});
        }
      });
    });
  return {
    name: 'dev-fake-login',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        const path = url.pathname;
        if (path === '/api/auth/me') {
          return send(res, 200, { enabled: true, emailEnabled: true, user: loggedIn ? { nick, provider, ...(provider === 'email' ? { email: 'test@example.com' } : {}), joinedAt: now, lastLoginAt: now, loginCount: 1, birth } : null });
        }
        // 이메일 가입·로그인 흉내: 가입하면 미리보기 서버 터미널에 인증 링크를 찍음 (메일은 안 보냄)
        if (path === '/api/auth/email/signup') {
          const body = await readBody(req);
          if (body.email === 'taken@test.com') return send(res, 409, { error: '이미 가입한 이메일이에요. 로그인해 주세요.', field: 'email' });
          console.log('[미리보기] 인증 링크: http://localhost:5179/api/auth/email/verify?token=dev');
          if (body.nick) nick = body.nick;
          return send(res, 200, { ok: true });
        }
        if (path === '/api/auth/email/verify') {
          loggedIn = true;
          provider = 'email';
          res.statusCode = 302;
          res.setHeader('location', '/?login=new&via=email');
          return res.end();
        }
        if (path === '/api/auth/email/login') {
          const body = await readBody(req);
          if (body.password !== devPw) return send(res, 401, { error: '이메일 또는 비밀번호가 맞지 않아요.' });
          loggedIn = true;
          provider = 'email';
          return send(res, 200, { ok: true, nick });
        }
        // 풀이 내역 흉내: 미리보기 서버 메모리에만
        if (path === '/api/history') {
          if (!loggedIn) return send(res, 401, { error: '로그인이 필요해요.', login: true });
          const key = url.searchParams.get('key');
          if (req.method === 'GET') return key ? send(res, 200, { item: devHist[key] || null }) : send(res, 200, { items: Object.values(devHist).map(({ parts, ...it }) => it) });
          if (req.method === 'DELETE') {
            delete devHist[key];
            return send(res, 200, { ok: true });
          }
          const b = await readBody(req);
          const cur = devHist[b.key] || { key: b.key, input: b.input, topic: b.topic, partner: b.partner, parts: {}, createdAt: new Date().toISOString() };
          cur.parts[b.partId] = b.text;
          cur.updatedAt = new Date().toISOString();
          devHist[b.key] = cur;
          return send(res, 200, { ok: true });
        }
        // 문의 흉내: 미리보기 서버 메모리에만
        if (path === '/api/inquiry') {
          if (!loggedIn) return send(res, 401, { error: '로그인이 필요해요.', login: true });
          if (req.method === 'GET') return send(res, 200, { inquiries: devInqs });
          const body = await readBody(req);
          const id = Date.now().toString(36);
          devInqs.unshift({ id, type: body.type, company: body.company || '', email: body.email || '', message: body.message, page: body.page, createdAt: new Date().toISOString(), answer: devInqs.length ? '' : '안녕하세요, 미리보기 답변이에요.', answeredAt: devInqs.length ? null : new Date().toISOString() });
          return send(res, 200, { ok: true, id });
        }
        if (path === '/api/auth/email/password') {
          const body = await readBody(req);
          if (body.current !== devPw) return send(res, 400, { error: '지금 비밀번호가 맞지 않아요.', field: 'current' });
          if (body.password === body.current) return send(res, 400, { error: '지금 비밀번호와 다른 비밀번호를 정해 주세요.', field: 'password' });
          devPw = body.password;
          return send(res, 200, { ok: true });
        }
        if (path === '/api/auth/email/reset-request') {
          console.log('[미리보기] 비밀번호 재설정 링크: http://localhost:5179/reset?token=' + 'a'.repeat(64));
          return send(res, 200, { ok: true });
        }
        if (path === '/api/auth/email/reset') {
          const body = await readBody(req);
          if (body.token !== 'a'.repeat(64)) return send(res, 400, { error: '링크가 만료됐어요. 비밀번호 찾기를 다시 해 주세요.', expired: true });
          loggedIn = true;
          return send(res, 200, { ok: true, nick });
        }
        if (path === '/api/auth/kakao/login') {
          loggedIn = true;
          provider = 'kakao';
          const next = url.searchParams.get('next') || '/';
          res.statusCode = 302;
          res.setHeader('location', `${next}${next.includes('?') ? '&' : '?'}login=ok`);
          return res.end();
        }
        if (path === '/api/auth/logout') {
          loggedIn = false;
          return send(res, 200, { ok: true });
        }
        if (path === '/api/auth/delete') {
          loggedIn = false;
          birth = null;
          return send(res, 200, { ok: true });
        }
        if (path === '/api/auth/nickname/suggest') {
          return send(res, 200, { nick: `천둥의 별빛 ${1 + Math.floor(Math.random() * 99)}` });
        }
        if (path === '/api/auth/nickname') {
          if (!loggedIn) return send(res, 401, { error: '로그인이 필요해요.' });
          const body = await readBody(req);
          const n = String(body.nick || '').replace(/\s+/g, ' ').trim();
          if ([...n].length < 2 || [...n].length > 12) return send(res, 400, { error: '닉네임은 2~12자로 정해 주세요.' });
          if (n.replace(/ /g, '') === '천둥도사') return send(res, 409, { error: '이미 쓰고 있는 닉네임이에요. 다른 닉네임을 정해 주세요.' }); // 미리보기용 중복 예시
          nick = n;
          return send(res, 200, { ok: true, nick });
        }
        if (path === '/api/auth/birth') {
          if (!loggedIn) return send(res, 401, { error: '로그인이 필요해요.' });
          if (req.method === 'DELETE') {
            birth = null;
            return send(res, 200, { ok: true });
          }
          const body = await readBody(req);
          birth = { ...(body.input || {}), savedAt: new Date().toISOString() };
          return send(res, 200, { ok: true, birth });
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devFakeLogin()],
});
