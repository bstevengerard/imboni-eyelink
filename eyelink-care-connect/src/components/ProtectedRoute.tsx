import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles: string[];
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip if still loading
    if (loading) return;

    // Get user from localStorage as primary source
    const storedUserStr = localStorage.getItem('user');
    let currentUser = user;

    // If user from context is null, try localStorage
    if (!currentUser && storedUserStr) {
      try {
        currentUser = JSON.parse(storedUserStr);
      } catch (e) {
        console.error('Failed to parse user from localStorage:', e);
      }
    }

    // If no user found at all, redirect to login
    if (!currentUser || !currentUser.role) {
      console.log('ProtectedRoute: No user found, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    // Check if user's role is allowed
    if (!allowedRoles.includes(currentUser.role)) {
      console.log('ProtectedRoute: Role not allowed, redirecting:', currentUser.role);
      // Redirect to correct portal based on role
      if (currentUser.role === 'patient') {
        navigate('/patient', { replace: true });
      } else if (currentUser.role === 'doctor' || currentUser.role === 'optometrist') {
        navigate('/doctor', { replace: true });
      } else if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
      return;
    }

    console.log('ProtectedRoute: Access granted for role:', currentUser.role);
  }, [user, loading, allowedRoles, navigate, location.pathname]);

  // Show loading while checking
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Double-check user before rendering
  const storedUserStr = localStorage.getItem('user');
  const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
  const renderUser = user || storedUser;

  if (!renderUser || !renderUser.role) {
    return null;
  }

  if (!allowedRoles.includes(renderUser.role)) {
    return null;
  }

  return <>{children}</>;
}
