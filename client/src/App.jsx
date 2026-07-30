import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import EquipmentDetail from './pages/manager/EquipmentDetail';
import CustomerDashboard from './pages/customer/CustomerDashboard';

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
          <Route path="/manager/equipment/:equipmentId" element={
            <ProtectedRoute role="manager"><EquipmentDetail /></ProtectedRoute>
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
