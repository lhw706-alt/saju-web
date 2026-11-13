import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 이 컴퓨터의 미리보기(npm run dev) 전용 가짜 로그인 — 실제 사이트(빌드)에는 들어가지 않음.
// 로그인 서버(netlify/functions/auth.mjs)와 카카오 키가 Netlify 에만 있어서, 미리보기에서도 로그인한 화면을
// 확인할 수 있도록 /api/auth/* 를 흉내 냄. 상태는 미리보기 서버 메모리에만 (재시작하면 사라짐).
function devFakeLogin() {
  let loggedIn = false;
  let birth = null;
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
          return send(res, 200, { enabled: true, user: loggedIn ? { nick: '천동이(테스트)', joinedAt: now, lastLoginAt: now, loginCount: 1, birth } : null });
        }
        if (path === '/api/auth/kakao/login') {
          loggedIn = true;
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
