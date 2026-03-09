import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StockIn from './pages/StockIn';
import StockOut from './pages/StockOut';
import StockInHistory from './pages/StockInHistory';
import StockOutHistory from './pages/StockOutHistory';
import Audit from './pages/Audit';
import Reports from './pages/Reports';
import Items from './pages/Items';
import Kitchens from './pages/Kitchens';
import Suppliers from './pages/Suppliers';
import './index.css';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="stock-in" element={<StockIn />} />
        <Route path="stock-out" element={<StockOut />} />
        <Route path="stock-in/history" element={<StockInHistory />} />
        <Route path="stock-out/history" element={<StockOutHistory />} />
        <Route path="audit" element={<ProtectedRoute roles={['admin','manager']}><Audit /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute roles={['admin','manager']}><Reports /></ProtectedRoute>} />
        <Route path="items" element={<ProtectedRoute roles={['admin','manager']}><Items /></ProtectedRoute>} />
        <Route path="kitchens" element={<ProtectedRoute roles={['admin']}><Kitchens /></ProtectedRoute>} />
        <Route path="suppliers" element={<ProtectedRoute roles={['admin','manager']}><Suppliers /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' } }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
