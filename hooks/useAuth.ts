"use client";

import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { 
  onAuthStateChanged, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Reset link sent! Check your email inbox.");
    } catch (err: any) {
      setError("Account not found with this email.");
    }
  };

  const signUp = async (email: string, pass: string, name: string) => {
    setError(null);
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/;
    if (!strongRegex.test(pass)) {
      setError("Password too weak: Use Uppercase, Number, and Symbol.");
      return;
    }
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: name });
      setUser({ ...res.user, displayName: name });
    } catch (err: any) {
      setError(err.code === 'auth/email-already-in-use' ? "Email already exists." : err.message);
    }
  };

  const login = async (email: string, pass: string) => {
    setError(null);
    try { await signInWithEmailAndPassword(auth, email, pass); } 
    catch (err: any) { setError("Invalid email or password."); }
  };

  const logout = () => signOut(auth);

  const getUserColor = (uid: string) => {
    const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
    let hash = 0;
    for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return { 
    user, signUp, login, loginWithGoogle, resetPassword, logout, 
    loading, error, message, 
    userColor: user ? getUserColor(user.uid) : "#000000" 
  };
}