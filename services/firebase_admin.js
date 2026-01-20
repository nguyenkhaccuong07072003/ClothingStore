import admin from 'firebase-admin';

let firebaseAdminApp;

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
  );

  firebaseAdminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  firebaseAdminApp = admin.app();
}

export default firebaseAdminApp;
