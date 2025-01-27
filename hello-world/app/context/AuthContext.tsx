'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, UserCredential } from 'firebase/auth';
import { auth } from '../../firebase';

// Define the shape of the context value
interface AuthContextType {
  user: User | null; // The user object or null
  signIn: () => Promise<UserCredential>; // Updated to return a Promise<UserCredential>
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (): Promise<UserCredential> => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider); // This function returns a Promise<UserCredential>
  };

  const logOut = async (): Promise<void> => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
