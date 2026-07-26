import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { ToastProvider } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Forgot from './pages/Forgot';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import CalendarReport from './pages/CalendarReport';
import Staff from './pages/Staff';
import Payslips from './pages/Payslips';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Leave from './pages/Leave';
import Verify from './pages/Verify';

const BootScreen = () => (
  <div className="boot"><span className="logo-mark big">SP</span><div className="boot-bar"><i /></div></div>
);

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <BootScreen />;
  return user ? children : <Navigate to="/login" replace />;
}
function RequireRole({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? children : <Navigate to="/" replace />;
}
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <BootScreen />;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
              <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
              <Route path="/forgot" element={<PublicOnly><Forgot /></PublicOnly>} />
              <Route path="/verify" element={<Verify />} />
              <Route element={<RequireAuth><Layout /></RequireAuth>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/leave" element={<Leave />} />
                <Route path="/calendar" element={<CalendarReport />} />
                <Route path="/payslips" element={<Payslips />} />
                <Route path="/invoices" element={<RequireRole roles={['admin', 'manager']}><Invoices /></RequireRole>} />
                <Route path="/reports" element={<RequireRole roles={['admin', 'manager']}><Reports /></RequireRole>} />
                <Route path="/staff" element={<RequireRole roles={['admin']}><Staff /></RequireRole>} />
                <Route path="/settings" element={<RequireRole roles={['admin']}><Settings /></RequireRole>} />
                <Route path="/profile" element={<Profile />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}