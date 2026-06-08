import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Living from './pages/Living';
import More from './pages/More';
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
          {/* 통합 탭 */}
          <Route path="/living" element={<Living />} />
          <Route path="/more" element={<More />} />
          {/* 기존 페이지 (라우트 유지: 직접 접근·홈 카드 링크) */}
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
