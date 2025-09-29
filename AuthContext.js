import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch role from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role || 'student'); // Default to student
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    role,
    loading,
    login: async (email, password) => {
      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    signup: async (email, password, role) => {
      try {
        const { user: newUser } = await auth.createUserWithEmailAndPassword(email, password);
        // Save role to Firestore
        await doc(db, 'users', newUser.uid).set({
          email,
          role,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Signup error:', error);
        throw error;
      }
    },
    logout: async () => {
      await auth.signOut();
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
