import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Shopping from './pages/Shopping';
import Checklist from './pages/Checklist';
import Chores from './pages/Chores';
import Tips from './pages/Tips';
import Budget from './pages/Budget';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* 풀스크린 (네비 없음) */}
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* 앱 셸 (하단 네비 + 온보딩 가드) */}
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/shopping" element={<Shopping />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/chores" element={<Chores />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/tips" element={<Tips />} />
        </Route>

        {/* 그 외 → 랜딩 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
