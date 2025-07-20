// lib/firebase/admin.ts
import admin from 'firebase-admin';
// import { serviceAccount } from './serviceAccountConfig'; // Assuming this is not used directly for env vars

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("CRITICAL ERROR: Firebase Admin environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not set. Check your .env.local file and deployment environment.");
} else {
  if (admin.apps.length === 0) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (error: any) {
      console.error("Firebase Admin SDK initialization error:", error.message);
    }
  }
}

const db = admin.apps.length > 0 ? admin.firestore() : (null as any);

export { db };
