import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { auth } = useAuth();
  if (!auth) return <Navigate to="/login" replace />;
  if (role && auth.role !== role) return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
