// src/hooks/useAuth.ts
/**
 * Convenience hook wrapping useAuthStore
 * Provides auth state + role-check helpers
 */
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';

export function useAuth() {
  const { user, isAuthenticated, accessToken, logout } = useAuthStore();

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isAdmin = user?.role === 'admin';
  const isDispatcher = user?.role === 'dispatcher';
  const isDriver = user?.role === 'driver';
  const canManageFleet = isAdmin || isDispatcher;

  return {
    user,
    isAuthenticated,
    accessToken,
    logout,
    hasRole,
    isAdmin,
    isDispatcher,
    isDriver,
    canManageFleet,
  };
}
