'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, UserCredential } from 'firebase/auth';
import { auth } from '../../firebase';
import { useRouter } from 'next/navigation';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface AuthContextType {
  user: User | null;
  signIn: () => Promise<UserCredential>;
  logOut: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);

        // Store user in Firestore if not already present
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            name: user.displayName,
            email: user.email,
            uid: user.uid,
            createdAt: new Date(),
          });
        }

      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const signIn = async (): Promise<UserCredential> => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result;
  };

  const logOut = async () => {
    await signOut(auth);
    setUser(null);
    router.push('/'); // Redirect to homepage after logout
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
