import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';

// Google Auth
export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign In Error:', error);
    throw error;
  }
};

// Email Auth
export const signInEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error('Email Sign In Error:', error);
    throw error;
  }
};

// Phone normalization helper
export const normalizePhone = (phone: string) => {
  let cleaned = phone.replace(/\D/g, '');
  
  // Normalize Ethiopian numbers
  if (cleaned.startsWith('0')) {
    // 09... -> 2519...
    cleaned = '251' + cleaned.substring(1);
  } else if (cleaned.length === 9 && (cleaned.startsWith('9') || cleaned.startsWith('7'))) {
    // 9... -> 2519...
    cleaned = '251' + cleaned;
  }
  
  return cleaned;
};

// Phone + Password (Virtual Email) Auth helper
const getVirtualEmail = (phone: string) => {
  const normalized = normalizePhone(phone);
  return `${normalized}@fitih.ai`;
};

export const signInPhonePassword = async (phone: string, pass: string) => {
  try {
    const virtualEmail = getVirtualEmail(phone);
    const result = await signInWithEmailAndPassword(auth, virtualEmail, pass);
    return result.user;
  } catch (error: any) {
    // Return ability for demo accounts: if it's a demo number and password is '123456', 
    // try to auto-signup if signin fails
    const normalized = normalizePhone(phone);
    const demoNumbers = ['251900000000', '251911111111', '251933333333', '251999999999'];
    if (demoNumbers.includes(normalized) && pass === '123456') {
      try {
        const virtualEmail = getVirtualEmail(phone);
        const result = await createUserWithEmailAndPassword(auth, virtualEmail, pass);
        return result.user;
      } catch (signupError) {
        // If it still fails, throw original error
        throw error;
      }
    }
    console.error('Phone+Pass Sign In Error:', error);
    throw error;
  }
};

export const signUpPhonePassword = async (phone: string, pass: string) => {
  try {
    const virtualEmail = getVirtualEmail(phone);
    const result = await createUserWithEmailAndPassword(auth, virtualEmail, pass);
    return result.user;
  } catch (error) {
    console.error('Phone+Pass Sign Up Error:', error);
    throw error;
  }
};

export const signUpEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error('Email Sign Up Error:', error);
    throw error;
  }
};
import { initializeFirestore, doc, getDoc, setDoc, addDoc, serverTimestamp, onSnapshot, collection, query, where, orderBy, updateDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with forceLongPolling for better reliability in some environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const toggleUserSubscription = async (userId: string, currentStatus: boolean) => {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      isSubscribed: !currentStatus
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
};

// Firestore Error Handling utility
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User profile helper
export const syncUserProfile = async (user: User, additionalData?: { 
  displayName?: string; 
  firstName?: string;
  lastName?: string;
  gender?: string;
  age?: number;
  occupation?: string;
  address?: string; 
  role?: string;
  specialization?: string;
  licenseNumber?: string;
  phoneNumber?: string;
}) => {
  const userRef = doc(db, 'users', user.uid);
  try {
    const userDoc = await getDoc(userRef);
    
    // Demo accounts check for ANY login
    let role = additionalData?.role || 'user';
    let isSubscribed = additionalData?.role === 'lawyer' ? false : (additionalData?.isSubscribed ?? false);
    
    let rawPhone = user.phoneNumber || additionalData?.phoneNumber || '';
    const currentPhone = rawPhone ? `+${normalizePhone(rawPhone)}` : '';
    
    const isAdminAccount = (currentPhone === '+251900000000' || currentPhone === '+251999999999');
    const isProAccount = (currentPhone === '+251911111111' || currentPhone === '+251933333333');

    if (!userDoc.exists()) {
      
      if (isAdminAccount) {
        role = 'admin';
        isSubscribed = true;
      } else if (isProAccount) {
        isSubscribed = true;
      }

      const userData = {
        uid: user.uid,
        phoneNumber: currentPhone,
        displayName: additionalData?.displayName || user.displayName || '',
        firstName: additionalData?.firstName || '',
        lastName: additionalData?.lastName || '',
        gender: additionalData?.gender || '',
        age: additionalData?.age || 0,
        occupation: additionalData?.occupation || '',
        address: additionalData?.address || '',
        role: role,
        isSubscribed: isSubscribed,
        chatCount: 0,
        docCount: 0,
        balance: 0,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };

      await setDoc(userRef, userData);

      // If they are a lawyer, sync to lawyers collection too
      if (role === 'lawyer') {
        const lawyerRef = doc(db, 'lawyers', user.uid);
        await setDoc(lawyerRef, {
          uid: user.uid,
          displayName: userData.displayName,
          firstName: userData.firstName,
          lastName: userData.lastName,
          gender: userData.gender,
          age: userData.age,
          occupation: userData.occupation,
          address: userData.address,
          specialization: additionalData?.specialization || 'General',
          licenseNumber: additionalData?.licenseNumber || '',
          experience: 1,
          bio: '',
          isVerified: false, // Must be verified by admin
          rating: 5.0,
          hourlyRate: 500,
          createdAt: serverTimestamp()
        });
      }
    } else {
      // If user exists but is a demo admin/pro account, ensure their role/status is correct
      if (isAdminAccount || isProAccount) {
        const updates: any = { lastLogin: serverTimestamp() };
        if (isAdminAccount) {
          updates.role = 'admin';
          updates.isSubscribed = true;
        } else if (isProAccount) {
          updates.isSubscribed = true;
        }
        await updateDoc(userRef, updates);
      } else {
        await updateDoc(userRef, { lastLogin: serverTimestamp() });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }
};

export const incrementUsage = async (uid: string, type: 'chat' | 'doc') => {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (type === 'chat') {
      await updateDoc(userRef, { chatCount: (data.chatCount || 0) + 1 });
    } else {
      await updateDoc(userRef, { docCount: (data.docCount || 0) + 1 });
    }
  }
};

export const processSubscription = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { isSubscribed: true });
};

export const processPayAsYouGo = async (uid: string, amount: number) => {
  const userRef = doc(db, 'users', uid);
  // In a real app, this would deduct from a balance or verify a transaction
  // For this demo, we'll just log it
  console.log(`Processing ${amount} Birr for user ${uid}`);
};

export const updateDisplayName = async (uid: string, name: string) => {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, { displayName: name });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
};

export const updateFullProfile = async (uid: string, data: {
  firstName: string;
  lastName: string;
  gender: string;
  age: number;
  occupation: string;
  address: string;
}) => {
  const userRef = doc(db, 'users', uid);
  try {
    const updateData = {
      ...data,
      displayName: `${data.firstName} ${data.lastName}`.trim()
    };
    await updateDoc(userRef, updateData);
    
    // Also update lawyer profile if they are a lawyer
    const userDoc = await getDoc(userRef);
    if (userDoc.exists() && userDoc.data().role === 'lawyer') {
      const lawyerRef = doc(db, 'lawyers', uid);
      await updateDoc(lawyerRef, updateData);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
};

// History Helpers
export const saveChatMessage = async (userId: string, text: string, role: 'user' | 'model') => {
  const chatRef = collection(db, 'users', userId, 'chats');
  try {
    await addDoc(chatRef, {
      userId,
      text,
      role,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${userId}/chats`);
  }
};

export const saveDocument = async (uid: string, title: string, type: string, content: string, metadata: any) => {
  const docRef = collection(db, 'documents');
  try {
    await addDoc(docRef, {
      uid,
      title,
      type,
      content,
      metadata,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `documents`);
  }
};
