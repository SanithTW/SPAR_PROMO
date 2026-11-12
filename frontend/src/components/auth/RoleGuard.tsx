import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { RoleType } from '../../types/index.js';

interface RoleGuardProps {
  allowedRoles: RoleType[];
  children: React.ReactNode;
  fallbackPath?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallbackPath = '/unauthorized',
}) => {
  const { hasRole, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!hasRole(allowedRoles)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
