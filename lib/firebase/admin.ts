// lib/firebase/admin.ts
import admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore;
let adminAuth: admin.auth.Auth;

// This condition prevents the app from initializing multiple times,
// which is a common issue in Next.js development environment.
if (admin.apps.length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // The private key from an environment variable needs its newlines restored.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("✅ Firebase Admin SDK initialized successfully.");
    } catch (error: any) {
      console.error("🔥 Firebase Admin SDK initialization error:", error.message);
    }
  } else {
    console.warn("⚠️ Firebase Admin environment variables are not set. Skipping initialization.");
  }
}

// Assign the initialized services to the exports
adminDb = admin.firestore();
adminAuth = admin.auth();

export { adminDb, adminAuth };