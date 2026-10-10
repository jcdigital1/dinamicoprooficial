import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './config';
import { UserProfile, UserRole, UserStatus } from '../types';

export const ADMIN_EMAILS = [
  'jeannmkt2@gmail.com',
  'jeanncarllosmkt@gmail.com',
];

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  isPending: boolean;
  isBlocked: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name?: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync profile and listen for real-time changes (e.g. when admin approves buyer)
  useEffect(() => {
    localStorage.removeItem('dinamico_pro_demo_auth');

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        const cleanEmail = currentUser.email?.trim().toLowerCase() || '';
        const isAdminAccount = isAuthorizedAdminEmail(cleanEmail);
        const userRef = doc(db, 'users', currentUser.uid);

        try {
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            // If it's the primary authorized admin email, ensure admin role and approved status
            if (isAdminAccount && (data.role !== 'admin' || data.status !== 'approved')) {
              const updatedAdminProfile: UserProfile = {
                ...data,
                email: cleanEmail,
                role: 'admin',
                status: 'approved',
                updatedAt: new Date().toISOString(),
              };
              await setDoc(userRef, updatedAdminProfile, { merge: true }).catch((e) => console.warn(e));
              // Ensure doc in admins collection for security rules
              await setDoc(doc(db, 'admins', currentUser.uid), {
                id: currentUser.uid,
                email: cleanEmail,
                createdAt: new Date().toISOString(),
              }).catch(() => {});
              setProfile(updatedAdminProfile);
            } else {
              setProfile(data);
            }
          } else {
            // Requirement 15: Document doesn't exist yet (account recovery for existing Auth users)
            const initialRole: UserRole = isAdminAccount ? 'admin' : 'user';
            const initialStatus: UserStatus = isAdminAccount ? 'approved' : 'pending';

            const newProfile: UserProfile = {
              id: currentUser.uid,
              email: cleanEmail,
              displayName: currentUser.displayName || (isAdminAccount ? 'Administrador Dinâmico Pro' : 'Comprador'),
              phone: '',
              role: initialRole,
              status: initialStatus,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await setDoc(userRef, newProfile).catch((err) => {
              console.warn('Could not write initial profile to Firestore:', err);
            });

            if (isAdminAccount) {
              await setDoc(doc(db, 'admins', currentUser.uid), {
                id: currentUser.uid,
                email: cleanEmail,
                createdAt: new Date().toISOString(),
              }).catch(() => {});
            }

            setProfile(newProfile);
          }
        } catch (e) {
          console.warn('Error reading user profile from Firestore:', e);
          // Fallback profile if Firestore read fails
          setProfile({
            id: currentUser.uid,
            email: cleanEmail,
            displayName: currentUser.displayName || (isAdminAccount ? 'Administrador' : 'Comprador'),
            role: isAdminAccount ? 'admin' : 'user',
            status: isAdminAccount ? 'approved' : 'pending',
            createdAt: new Date().toISOString(),
          });
        }

        // Set up real-time listener on user doc so status updates (approvals/blocks) reflect immediately
        try {
          unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              const liveData = docSnap.data() as UserProfile;
              setProfile(liveData);
            }
          }, (err) => {
            console.warn('Profile snapshot listener error:', err);
          });
        } catch (e) {
          console.warn('Failed to attach profile listener:', e);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!auth.currentUser) return null;
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        return data;
      }
    } catch (e) {
      console.warn('Error refreshing profile:', e);
    }
    return profile;
  };

  const loginWithEmail = async (rawEmail: string, pass: string) => {
    const email = rawEmail.trim().toLowerCase();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        throw new Error(
          'O provedor E-mail/Senha precisa estar ativado no Firebase Console deste projeto (Authentication > Sign-in method > E-mail/senha).'
        );
      }
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        throw new Error('E-mail ou senha incorretos. Verifique suas credenciais de acesso.');
      }
      throw err;
    }
  };

  const registerWithEmail = async (rawEmail: string, pass: string, name?: string, phone?: string) => {
    const email = rawEmail.trim().toLowerCase();
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      const isAdminAccount = isAuthorizedAdminEmail(email);

      const newProfile: UserProfile = {
        id: res.user.uid,
        email,
        displayName: name?.trim() || email.split('@')[0],
        phone: phone?.trim() || '',
        role: isAdminAccount ? 'admin' : 'user',
        status: isAdminAccount ? 'approved' : 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Reliable write to users collection with retry (Requirement 1 & 2)
      try {
        await setDoc(doc(db, 'users', res.user.uid), newProfile);
      } catch (writeErr) {
        console.warn('Initial write to users collection failed, retrying in 300ms...', writeErr);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await setDoc(doc(db, 'users', res.user.uid), newProfile);
      }

      if (isAdminAccount) {
        await setDoc(doc(db, 'admins', res.user.uid), {
          id: res.user.uid,
          email,
          createdAt: new Date().toISOString(),
        }).catch((e) => console.warn('Admin record write warning:', e));
      }

      setProfile(newProfile);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('Este e-mail já está cadastrado no sistema. Faça login com sua senha.');
      }
      if (err.code === 'auth/weak-password') {
        throw new Error('A senha deve ter pelo menos 6 caracteres.');
      }
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const resetPassword = async (rawEmail: string) => {
    const email = rawEmail.trim().toLowerCase();
    await sendPasswordResetEmail(auth, email);
  };

  const isAdmin = Boolean(profile?.role === 'admin' || isAuthorizedAdminEmail(user?.email));
  const isApproved = Boolean(isAdmin || profile?.status === 'approved');
  const isPending = Boolean(!isAdmin && profile?.status === 'pending');
  const isBlocked = Boolean(!isAdmin && profile?.status === 'blocked');

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isApproved,
        isPending,
        isBlocked,
        loginWithEmail,
        registerWithEmail,
        logout,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
