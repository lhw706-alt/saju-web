import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Result from './pages/Result.jsx';
import Start from './pages/Start.jsx';
import CharmBook from './pages/CharmBook.jsx';
import MatchInvite from './pages/MatchInvite.jsx';
import Admin from './pages/Admin.jsx';
import My from './pages/My.jsx';
import Reset from './pages/Reset.jsx';
import Privacy from './pages/Privacy.jsx';
import NotFound from './pages/NotFound.jsx';
import { initAnalytics } from './lib/analytics.js';
import { loadFonts } from './lib/fonts.js';
import './styles.css';

loadFonts();
initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/fortune" element={<Home />} />
          <Route path="/charms" element={<CharmBook />} />
          <Route path="/match/:token" element={<MatchInvite />} />
          <Route path="/start" element={<Start />} />
          <Route path="/result" element={<Result />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/my/:tab?" element={<My />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
