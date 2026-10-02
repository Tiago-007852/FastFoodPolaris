import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthUser, authApi, subscribeToChanges } from './lib/api';

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  role: string | null;
  /** Re-reads the session from the API (after sign in / sign out). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication now runs against the Postgres API (Better Auth) instead of
 * Firebase Auth. The session lives in an httpOnly cookie, so there is no user
 * object in local storage and the role comes straight from the `user` table.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const session = await authApi.session();
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Failed to read session', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // A role change made by another admin is broadcast over SSE.
    return subscribeToChanges((table) => {
      if (table === 'users') refresh();
    });
  }, [refresh]);

  const role = user?.role ?? null;
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, role, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};