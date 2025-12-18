
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

export const register = async (username: string, email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update the display name
  await updateProfile(userCredential.user, {
    displayName: username
  });

  return mapUser(userCredential.user);
};

export const login = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return mapUser(userCredential.user);
};

export const loginWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  return mapUser(userCredential.user);
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

// Listener for auth state changes
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (firebaseUser) => {
    callback(firebaseUser ? mapUser(firebaseUser) : null);
  });
};
