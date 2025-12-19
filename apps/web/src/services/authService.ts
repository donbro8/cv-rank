
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

export interface User {
  username: string;
  email: string | null;
  uid: string;
}

// Map Firebase user to our app's User interface
const mapUser = (firebaseUser: FirebaseUser): User => {
  return {
    username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    email: firebaseUser.email,
    uid: firebaseUser.uid
  };
};

const MOCK_USER: User = {
  username: "Test User",
  email: "test@example.com",
  uid: "mock-user-123"
};

const MOCK_STORAGE_KEY = 'mock_auth_session';

export const register = async (username: string, email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Update the display name
  await updateProfile(userCredential.user, {
    displayName: username
  });

  return mapUser(userCredential.user);
};

export const login = async (email: string, password: string): Promise<User> => {
  // Mock Auth Bypass
  if (email === 'test@example.com' && password === 'password123') {
    localStorage.setItem(MOCK_STORAGE_KEY, 'true');
    return MOCK_USER;
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return mapUser(userCredential.user);
};

export const loginWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  return mapUser(userCredential.user);
};

export const logout = async (): Promise<void> => {
  // Clear mock session
  if (localStorage.getItem(MOCK_STORAGE_KEY)) {
    localStorage.removeItem(MOCK_STORAGE_KEY);
    // Force page reload to clear state effectively since we can't easily trigger the auth listener for mock logout
    window.location.reload();
    return;
  }
  await signOut(auth);
};

// Listener for auth state changes
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  // Check for mock session on init
  if (typeof window !== 'undefined' && localStorage.getItem(MOCK_STORAGE_KEY) === 'true') {
    callback(MOCK_USER);
    // Return a no-op unsubscribe function for mock auth
    return () => { };
  }

  return onAuthStateChanged(auth, (firebaseUser) => {
    callback(firebaseUser ? mapUser(firebaseUser) : null);
  });
};
