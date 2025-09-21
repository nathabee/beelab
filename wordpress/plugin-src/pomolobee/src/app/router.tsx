// router.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import PomoloBeeHome from '@pages/PomoloBeeHome';
import PomoloBeeLogin from '@pages/PomoloBeeLogin';
import PomoloBeeDashboard from '@pages/PomoloBeeDashboard';
import PomoloBeeFarm from '@pages/PomoloBeeFarm';
import PomoloBeeFarmMgt from '@pages/PomoloBeeFarmMgt';
import { ErrorPage } from '@bee/common';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/"            element={<PomoloBeeHome />} />
      <Route path="/login/*"     element={<PomoloBeeLogin />} />
      <Route path="/error/*"     element={<ErrorPage plugin="pomolobee" />} />
      <Route path="/dashboard/*" element={<PomoloBeeDashboard />} />
      <Route path="/farm/*"      element={<PomoloBeeFarm />} />
      <Route path="/farmmgt/*"   element={<PomoloBeeFarmMgt />} />
      <Route path="*"            element={<Navigate to="/" replace />} />
    </Routes>
  );
}
