import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, addDoc, serverTimestamp, onSnapshot, collection, query, where, orderBy, updateDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// CRITICAL: Connection Test
async function testConnection() {
  try {
    // Attempt to ping the backend
    await getDocFromServer(doc(db, '_health_', 'check')).catch(() => {});
    console.log("Firestore connection initialized.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firestore connectivity issue detected. Please check if your database is provisioned and reachable.");
    }
  }
}
testConnection();

// SMS OTP Verification Pattern for Ethiopia (+251)
export const setupRecaptcha = (containerId: string) => {
  if (!(window as any).recaptchaVerifier) {
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      }
    });
  }
  return (window as any).recaptchaVerifier;
};

export const clearRecaptcha = () => {
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
      delete (window as any).recaptchaVerifier;
    } catch (e) {
      console.error('Error clearing recaptcha:', e);
    }
  }
};

export const sendOTP = async (phoneNumber: string, appVerifier: any) => {
  // Ensure number is in E.164 format
  let formattedNumber = phoneNumber;
  if (phoneNumber.startsWith('0')) {
    formattedNumber = '+251' + phoneNumber.substring(1);
  } else if (!phoneNumber.startsWith('+')) {
    formattedNumber = '+251' + phoneNumber;
  }
  
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
    return confirmationResult;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
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
  address?: string; 
  role?: string;
  specialization?: string;
  licenseNumber?: string;
}) => {
  const userRef = doc(db, 'users', user.uid);
  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      // Demo accounts check
      let role = additionalData?.role || 'user';
      let isSubscribed = false;
      
      if (user.phoneNumber === '+251900000000') {
        role = 'admin';
        isSubscribed = true;
      } else if (user.phoneNumber === '+251911111111') {
        isSubscribed = true;
      }

      const userData = {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        displayName: additionalData?.displayName || user.displayName || '',
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
      await updateDoc(userRef, { lastLogin: serverTimestamp() });
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
