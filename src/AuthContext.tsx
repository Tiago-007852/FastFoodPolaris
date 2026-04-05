import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInAnonymously, GoogleAuthProvider } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  role: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAIL = "miguellanttonio007@gmail.com";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        // Create/Update user profile on login
        const userRef = doc(db, 'users', u.uid);
        
        // Listen to user document for role changes
        unsubUser = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setRole(data.role || (u.isAnonymous ? 'visitor' : 'user'));
            
            // Sync displayName if it's missing in Firestore but available on user object
            if (!data.displayName && u.displayName && !u.isAnonymous) {
              setDoc(userRef, { displayName: u.displayName }, { merge: true });
            }
          } else {
            // If user doesn't exist in Firestore, create them
            let initialRole = 'visitor';
            if (!u.isAnonymous) {
              initialRole = u.email === SUPER_ADMIN_EMAIL ? 'admin' : 'user';
            }
            
            setDoc(userRef, {
              email: u.email || null,
              role: initialRole,
              isAnonymous: u.isAnonymous,
              lastLogin: serverTimestamp(),
              displayName: u.displayName || (u.isAnonymous ? 'Visitante' : null),
              photoURL: u.photoURL || null
            }, { merge: true }).catch(err => {
              console.error("Error creating user profile:", err);
            });
            setRole(initialRole);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error in user snapshot listener:", error);
          // If we can't read our own user doc, we might still be the super admin
          if (u.email === SUPER_ADMIN_EMAIL) {
            setRole('admin');
          } else {
            setRole(u.isAnonymous ? 'visitor' : 'user');
          }
          setLoading(false);
        });
      } else {
        if (unsubUser) {
          unsubUser();
          unsubUser = null;
        }
        // Sign in anonymously if no user
        signInAnonymously(auth).catch(err => {
          if (err.code === 'auth/admin-restricted-operation') {
            console.warn("Anonymous authentication is not enabled in the Firebase Console. Please enable it to track visitors.");
          } else if (err.code === 'auth/network-request-failed') {
            console.warn("Network error during anonymous sign-in. This might be temporary.");
          } else {
            console.error("Error signing in anonymously:", err);
          }
          setLoading(false);
        });
        setRole(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUser) unsubUser();
    };
  }, []);

  const isAdmin = role === 'admin' || (user?.email === SUPER_ADMIN_EMAIL && user?.emailVerified);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, role }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
