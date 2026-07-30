import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ManagerDashboard from './pages/manager/ManagerDashboard';

// Placeholder pages — teammates replace these with real pages
const AdminDashboard    = () => <div className="p-8">Admin Dashboard — Person A builds here</div>;
const CustomerDashboard = () => <div className="p-8">Customer Dashboard — Person C builds here</div>;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />

          <Route path="/manager" element={
            <ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>
          } />
          <Route path="/manager/*" element={
            <ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>
          } />

          <Route path="/customer" element={
            <ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>
          } />
          <Route path="/customer/*" element={
            <ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
