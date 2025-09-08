require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

async function setupAdminUser() {
  try {
    console.log('Setting up admin user...');

    // Admin user details
    const adminEmail = 'admin123@gmail.com';
    const adminPassword = 'AutoAdmin123';
    const adminName = 'Admin User';

    // Check if user already exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(adminEmail);
      console.log('Admin user already exists in Firebase Auth:', userRecord.uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create user in Firebase Auth
        console.log('Creating admin user in Firebase Auth...');
        userRecord = await admin.auth().createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: adminName
        });
        console.log('Admin user created in Firebase Auth:', userRecord.uid);
      } else {
        throw error;
      }
    }

    // Set custom claims for admin role
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      admin: true
    });
    console.log('Custom claims set for admin user');

    // Add user to admins collection in Firestore
    const adminData = {
      email: adminEmail,
      name: adminName,
      role: 'admin',
      isAdmin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null
    };

    await admin.firestore().collection('admins').doc(userRecord.uid).set(adminData);
    console.log('Admin user added to admins collection in Firestore');

    // Also add to users collection for consistency
    const userData = {
      email: adminEmail,
      name: adminName,
      role: 'admin',
      isAdmin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);
    console.log('Admin user added to users collection in Firestore');

    console.log('✅ Admin user setup completed successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('UID:', userRecord.uid);

  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
  } finally {
    process.exit();
  }
}

// Run the setup
setupAdminUser();
