import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Shopping from './pages/Shopping';
import Checklist from './pages/Checklist';
import ComingSoon from './pages/ComingSoon';

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
          <Route
            path="/chores"
            element={
              <ComingSoon
                title="가사노동 기록"
                emoji="👥"
                desc="자연어로 기록하면 구성원별 분배 차트와 공정성 점수를 보여드려요."
                phase="P1"
              />
            }
          />
          <Route
            path="/budget"
            element={
              <ComingSoon
                title="가계 관리"
                emoji="💰"
                desc="사치품 경고, 배송비 낚시 필터, 월간 고정비 캘린더를 준비 중이에요."
                phase="P2"
              />
            }
          />
          <Route
            path="/tips"
            element={
              <ComingSoon
                title="살림 팁"
                emoji="💡"
                desc="청소·빨래·요리·수납·절약 꿀팁 50개를 검색해서 보여드려요."
                phase="P1"
              />
            }
          />
        </Route>

        {/* 그 외 → 랜딩 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
