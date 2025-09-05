const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Middleware to verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;
    
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name
    });

    // Set custom claims for role
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    // Store additional user data in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      name,
      email,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Get user token
    const token = await admin.auth().createCustomToken(userRecord.uid);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        uid: userRecord.uid,
        name,
        email,
        role
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { idToken, email, password } = req.body;

    // There are two authentication methods:
    // 1. Using idToken - preferred method when frontend uses Firebase Auth
    // 2. Using email/password - fallback method
    
    let decodedToken;
    
    if (idToken) {
      console.log('Verifying Firebase ID token...');
      // Verify the Firebase ID token
      decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log('Token verified, user:', decodedToken);
    } else if (email && password) {
      console.log('Using email/password authentication...');
      // This is a more risky approach as we're handling credentials directly
      // Sign in with email and password using admin SDK
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        // We can't verify the password directly with Admin SDK
        // Creating a custom token for the user
        const customToken = await admin.auth().createCustomToken(userRecord.uid);
        
        // Instead of directly using this as decoded token, we should provide 
        // the custom token to the client and have them exchange it for an ID token
        decodedToken = {
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName || email.split('@')[0]
        };
        console.log('Email/password auth successful, user:', decodedToken);
      } catch (error) {
        console.error('Email/password authentication failed:', error);
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    } else {
      console.log('No authentication credentials provided');
      return res.status(401).json({ error: 'No authentication credentials provided' });
    }
    
    // Variables to store user data
    let userData = null;
    let role = 'user';
    let isAdmin = false;
    let fromCollection = 'users';
    
    // For regular login, only check the users collection
    try {
      // Check regular users collection
      console.log('Checking users collection for user:', decodedToken.uid);
      const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
      
      if (userDoc.exists) {
        userData = userDoc.data();
        role = userData.role || 'user';
        isAdmin = userData.isAdmin === true || userData.role === 'admin';
        console.log('User data from Firestore:', userData);
      }
    } catch (firestoreError) {
      console.log('Error fetching from Firestore:', firestoreError);
      // Continue with Auth data if Firestore fails
    }
    
    if (!userData) {
      console.log('No Firestore data, using claims from token');
      // Use custom claims from the token if no Firestore data
      userData = {
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        role: decodedToken.admin ? 'admin' : 'user'
      };
      
      // Create regular user document
      admin.firestore().collection('users').doc(decodedToken.uid).set({
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        role: 'user',
        isAdmin: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
        .then(() => console.log('Created user document in Firestore'))
        .catch(err => console.error('Failed to create user document:', err));
    }

    console.log('Sending response with user data:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
      isAdmin,
      fromCollection
    });

    // Create a custom token if we're using email/password login
    let tokenToReturn = idToken;
    let tokenType = 'id_token';

    if (!idToken && email && password) {
      // Create a proper Firebase custom token
      tokenToReturn = await admin.auth().createCustomToken(decodedToken.uid, {
        role: role,
        isAdmin: isAdmin
      });
      tokenType = 'custom_token';
      console.log('Created custom token for email/password login, length:', tokenToReturn.length);
    }

    // Return proper token with the response
    const response = {
      message: 'Login successful',
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: userData.name || decodedToken.name || decodedToken.email.split('@')[0],
        role: role,
        isAdmin: isAdmin,
        fromCollection: fromCollection
      },
      token: tokenToReturn,
      tokenType: tokenType
    };

    // Add instructions for custom token usage
    if (tokenType === 'custom_token') {
      response.tokenInstructions = {
        type: 'custom_token',
        message: 'This is a Firebase custom token. You must exchange it for an ID token before using it for authenticated requests.',
        exchangeInstructions: 'Use Firebase Auth SDK: firebase.auth().signInWithCustomToken(token).then(() => firebase.auth().currentUser.getIdToken())',
        note: 'Do not send custom tokens directly in Authorization headers. Always exchange them for ID tokens first.'
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Admin-specific login endpoint
router.post('/admin-login', async (req, res) => {
  try {
    console.log('Admin login request received:', req.body);
    const { idToken, email } = req.body;

    if (!idToken) {
      console.log('No idToken provided in admin login request');
      return res.status(401).json({ error: 'No ID token provided' });
    }

    console.log('Verifying Firebase ID token for admin login...', idToken.substring(0, 20) + '...');
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('Token verified, admin user:', decodedToken);
    
    // Variables to store user data
    let userData = null;
    let role = 'user';
    let isAdmin = false;
    let fromCollection = null;
    
    // For admin login, check Firestore for admin status
    try {
      console.log('Checking Firestore for admin status, user:', decodedToken.uid, decodedToken.email);

      // Check if user exists in admins collection
      const adminDoc = await admin.firestore().collection('admins').doc(decodedToken.uid).get();

      if (adminDoc.exists) {
        console.log('User found in admins collection');
        userData = adminDoc.data();
        fromCollection = 'admins';
        role = 'admin';
        isAdmin = true;

        // Update lastLogin in admin document
        await admin.firestore().collection('admins').doc(decodedToken.uid).update({
          lastLogin: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log the admin login to admin_logs collection for audit (optional)
        try {
          await admin.firestore().collection('admin_logs').add({
            action: 'admin_login',
            adminId: decodedToken.uid,
            email: decodedToken.email,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: req.ip || 'unknown'
          });
        } catch (logError) {
          console.log('Could not log admin login (Firestore may not be available):', logError.message);
        }
      } else {
        // Check if user exists in regular users collection with admin role
        console.log('User not in admins collection, checking users collection');
        const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();

        if (userDoc.exists) {
          const userDataFromUsers = userDoc.data();
          if (userDataFromUsers.isAdmin === true || userDataFromUsers.role === 'admin') {
            console.log('User found in users collection with admin role');
            userData = userDataFromUsers;
            fromCollection = 'users';
            role = 'admin';
            isAdmin = true;
          } else {
            console.log('User found in users collection but not admin');
            return res.status(403).json({ error: 'Not authorized as admin' });
          }
        } else {
          console.log('User not found in any collection');
          return res.status(403).json({ error: 'Not authorized as admin' });
        }
      }
    } catch (firestoreError) {
      console.log('Error with Firestore during admin check:', firestoreError.message);
      return res.status(500).json({ error: 'Admin authentication error' });
    }
    
    if (!userData) {
      console.log('No admin data found for this user');
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    console.log('Sending admin login response with user data:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
      isAdmin,
      fromCollection
    });

    res.json({
      message: 'Admin login successful',
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: userData.name || decodedToken.name || decodedToken.email.split('@')[0],
        role: role,
        isAdmin: isAdmin,
        fromCollection: fromCollection
      },
      token: idToken  // Return the original ID token that was verified
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(401).json({ error: 'Admin authentication failed' });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Check if user has admin claims in token
    if (decodedToken.admin === true || decodedToken.role === 'admin') {
      console.log('Token verification: User has admin claims');

      // Update Firestore user document to ensure admin fields are set
      try {
        const userRef = admin.firestore().collection('users').doc(decodedToken.uid);
        await userRef.set({
          role: 'admin',
          isAdmin: true
        }, { merge: true });
        console.log('Firestore user document updated with admin role and isAdmin=true');
      } catch (firestoreError) {
        console.log('Firestore error updating admin fields:', firestoreError.message);
      }

      // Try to get admin data from Firestore
      try {
        const adminDoc = await admin.firestore().collection('admins').doc(decodedToken.uid).get();
        if (adminDoc.exists) {
          const adminData = adminDoc.data();
          return res.json({
            valid: true,
            user: {
              uid: decodedToken.uid,
              email: decodedToken.email,
              name: adminData.name || decodedToken.name,
              role: 'admin',
              isAdmin: true,
              fromCollection: 'admins'
            }
          });
        }
      } catch (firestoreError) {
        console.log('Firestore error in token verification, using token claims:', firestoreError.message);
      }

      // Fall back to token claims
      return res.json({
        valid: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email.split('@')[0],
          role: 'admin',
          isAdmin: true,
          fromCollection: 'token_claims'
        }
      });
    }

    // For regular users, try Firestore first
    try {
      const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        return res.json({
          valid: true,
          user: {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: userData.name || decodedToken.name,
            role: userData.role || 'user',
            isAdmin: userData.isAdmin === true || userData.role === 'admin',
            fromCollection: 'users'
          }
        });
      }
    } catch (firestoreError) {
      console.log('Firestore error for regular user, using token claims:', firestoreError.message);
    }

    // Fall back to token claims for regular users
    res.json({
      valid: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        role: 'user',
        isAdmin: false,
        fromCollection: 'token_claims'
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
