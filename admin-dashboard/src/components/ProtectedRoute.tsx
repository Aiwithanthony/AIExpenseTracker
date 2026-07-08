import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getToken } from '../services/api';

/** Redirects to /login when there is no stored admin token. */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
