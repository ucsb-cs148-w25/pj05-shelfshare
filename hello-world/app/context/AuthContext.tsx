'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, UserCredential } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

// Define the context type
interface AuthContextType {
  user: User | null;
  signIn: () => Promise<UserCredential>;
  logOut: () => Promise<void>;
}

// Create context with an explicit type and default value of `null`
const AuthContext = createContext<AuthContextType | null>(null);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (): Promise<UserCredential> => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider).then(async (result) => {
      const user = result.user;
      const email = user.email;
      const defaultName = email.split('@')[0];
      const defaultAboutMe = "Write About Yourself!"
      const defaultPGenre = "#fantasy#mystery#horror"
  
      await setDoc(doc(db, 'profile', user.uid), {
        uid: user.uid,
        aboutMe: defaultAboutMe,
        email: email,
        pgenre: defaultPGenre,
        profilePicUrl: user.photoURL,
        username: defaultName,
      }, { merge: true });
  
      console.log(`User data saved for ${user.email} with UID: ${user.uid}`);
      return result;
    });
  };

  const logOut = () => {
    return signOut(auth);
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}