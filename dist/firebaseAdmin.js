const admin = require('firebase-admin');

// Check if Firebase Admin is already initialized
if (admin.apps.length === 0) {
    try {
        // Use environment variables or application default credentials
        // For local development, you can use a service account key file
        // For production, use environment variables or a secret manager
        let firebaseConfig;
        
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            // If the service account is provided as an environment variable
            try {
                firebaseConfig = {
                    credential: admin.credential.cert(
                        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
                    )
                };
            } catch (err) {
                console.error('Error parsing Firebase service account from env:', err);
                process.exit(1);
            }
        } else {
            // Default to application default credentials
            firebaseConfig = {
                projectId: process.env.FIREBASE_PROJECT_ID || 'autopromote-464de',
                credential: admin.credential.applicationDefault()
            };
        }

        admin.initializeApp(firebaseConfig);
        console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Error initializing Firebase Admin:', error);
        process.exit(1);
    }
}

// Initialize Firestore and other services
const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = { db, auth, storage, admin };
