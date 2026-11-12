import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Result from './pages/Result.jsx';
import Privacy from './pages/Privacy.jsx';
import NotFound from './pages/NotFound.jsx';
import { initAnalytics } from './lib/analytics.js';
import './styles.css';

initAnalytics();

// 브랜드 시안 페이지는 개발 서버에서만 (배포 번들에 포함되지 않음)
const Brand = import.meta.env.DEV ? React.lazy(() => import('./pages/Brand.jsx')) : null;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/result" element={<Result />} />
          <Route path="/privacy" element={<Privacy />} />
          {Brand && <Route path="/brand" element={<Suspense fallback={null}><Brand /></Suspense>} />}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
