import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { auth } = useAuth();
  if (!auth) return <Navigate to="/login" replace />;

  // Admin users can access all dashboard roles (admin/manager/customer)
  if (role && auth.role !== role && auth.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
