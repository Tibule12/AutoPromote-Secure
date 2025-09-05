# AutoPromote Maintenance Guide

This guide provides instructions for maintaining, updating, and extending the AutoPromote application.

## Regular Maintenance Tasks

### Dependencies Updates

**Monthly:**
1. Check for outdated dependencies:
   ```bash
   npm outdated
   ```

2. Update dependencies with security updates:
   ```bash
   npm audit fix
   ```

3. Update all dependencies (test thoroughly afterward):
   ```bash
   npm update
   ```

4. For major version updates, update packages individually and test each:
   ```bash
   npm install package-name@latest
   ```

### Security Checks

**Bi-weekly:**
1. Run security audit:
   ```bash
   npm audit
   ```

2. Check for vulnerabilities in Firebase dependencies:
   ```bash
   npm audit --prod
   ```

3. Review Firebase security rules in the Firebase console
4. Review API authentication and authorization logic

### Performance Monitoring

**Weekly:**
1. Check API response times using Render metrics
2. Monitor server resource usage (CPU, memory)
3. Review database query performance
4. Check for any API endpoints with high error rates

### Database Maintenance

**Monthly:**
1. Check for unused or orphaned data
2. Verify database indexes are optimized
3. Archive old analytics data if necessary
4. Back up critical data

## Code Organization

The AutoPromote application follows a modular organization pattern:

### Core Components

- `server.js` - Main application entry point
- `firebaseAdmin.js` - Firebase Admin SDK initialization
- `authMiddleware.js` - Authentication middleware
- `validationMiddleware.js` - Request validation

### Service Modules

- `promotionService.js` - Content promotion logic
- `optimizationService.js` - Content optimization algorithms

### API Routes

- `authRoutes.js` - Authentication endpoints
- `userRoutes.js` - User management
- `contentRoutes.js` - Content management
- `analyticsRoutes.js` - Analytics endpoints
- `adminRoutes.js` - Admin functions

## Adding New Features

### Adding a New API Endpoint

1. Identify the appropriate route file for your endpoint
2. Add the endpoint with proper validation and authentication:

```javascript
// Example: Adding a new endpoint to contentRoutes.js
router.post('/feature', authMiddleware, validateFeatureData, async (req, res) => {
  try {
    // Implement feature logic
    res.status(201).json({ message: 'Feature created successfully' });
  } catch (error) {
    console.error('Error creating feature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

3. Add validation middleware if needed:

```javascript
// In validationMiddleware.js
const validateFeatureData = (req, res, next) => {
  const { name, type } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string') {
    errors.push('Name is required and must be a string');
  }

  if (!type || typeof type !== 'string') {
    errors.push('Type is required and must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

module.exports = {
  // Add to exports
  validateFeatureData,
  // ... existing exports
};
```

4. Test the new endpoint thoroughly

### Creating a New Service

1. Create a new service file (e.g., `newService.js`):

```javascript
const { db } = require('./firebaseAdmin');

class NewService {
  async performOperation(data) {
    try {
      // Implement service logic
      return { success: true, result: 'Operation completed' };
    } catch (error) {
      console.error('Error in NewService:', error);
      throw error;
    }
  }
}

module.exports = new NewService();
```

2. Import and use the service in your routes:

```javascript
const newService = require('./newService');

router.post('/operation', authMiddleware, async (req, res) => {
  try {
    const result = await newService.performOperation(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Database Schema Updates

When updating the database schema:

1. Document the changes in `DATABASE_SCHEMA_UPDATE_TODO.md`
2. Create a migration script if needed
3. Test migrations thoroughly in a development environment
4. Deploy schema changes before deploying code that depends on them

Example migration script:

```javascript
// migrations/update-content-schema.js
const { db } = require('../firebaseAdmin');

async function migrateContentSchema() {
  try {
    const contentSnapshot = await db.collection('content').get();
    const batch = db.batch();
    
    contentSnapshot.forEach(doc => {
      const data = doc.data();
      // Add new field with default value
      batch.update(doc.ref, { 
        new_field: 'default_value',
        updated_at: new Date()
      });
    });
    
    await batch.commit();
    console.log(`Migrated ${contentSnapshot.size} content documents`);
  } catch (error) {
    console.error('Migration error:', error);
  }
}

migrateContentSchema();
```

## Error Handling and Logging

The application uses a centralized error handling middleware in `server.js`. When adding new features:

1. Use consistent error handling patterns:

```javascript
try {
  // Feature logic
} catch (error) {
  console.error('Feature error:', error);
  // Let the global error handler manage the response
  next(error);
}
```

2. Add specific error types when needed:

```javascript
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Usage
if (!isValid) {
  throw new ValidationError('Invalid data format');
}
```

3. The global error handler will format responses appropriately based on error type

## Environment Configuration

When adding new configuration options:

1. Update the `.env.example` file with the new variables
2. Add the variables to your local `.env` file
3. Add the variables to your Render deployment environment
4. Use the variables in your code with fallback values:

```javascript
const NEW_CONFIG = process.env.NEW_CONFIG || 'default_value';
```

## Deployment Process

### Testing Changes

1. Make changes in a feature branch
2. Test changes locally with `npm run dev`
3. Run security audit with `npm audit`
4. Push to GitHub and verify GitHub Actions pass

### Deploying to Render

1. Merge changes to the main branch
2. GitHub Actions will run tests
3. Render will automatically deploy from the main branch
4. Monitor the deployment logs for any errors
5. Test the deployed application to verify changes

### Manual Deployment (if needed)

1. In the Render dashboard, navigate to your service
2. Click "Manual Deploy"
3. Select "Clear build cache & deploy" for a full rebuild

## Monitoring and Alerts

### Setting Up Monitoring

1. Use Render's built-in monitoring for basic metrics
2. Set up Firebase Alerts for authentication issues
3. Monitor Firestore usage to avoid unexpected costs

### Troubleshooting Production Issues

1. Check Render logs for error messages
2. Verify environment variables are correctly set
3. Test the API endpoints with Postman or similar tools
4. Check Firebase console for any service disruptions

## Backup and Recovery

### Database Backups

1. Export Firestore data regularly using Firebase Admin SDK:

```javascript
// scripts/backup-firestore.js
const { admin } = require('../firebaseAdmin');
const fs = require('fs');

async function backupFirestore() {
  try {
    const collections = ['users', 'content', 'analytics'];
    const backup = {};
    
    for (const collection of collections) {
      const snapshot = await admin.firestore().collection(collection).get();
      backup[collection] = [];
      
      snapshot.forEach(doc => {
        backup[collection].push({
          id: doc.id,
          data: doc.data()
        });
      });
    }
    
    fs.writeFileSync(
      `backup-${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(backup, null, 2)
    );
    
    console.log('Backup completed successfully');
  } catch (error) {
    console.error('Backup error:', error);
  }
}

backupFirestore();
```

2. Schedule regular backups with a cron job or similar service

### Recovery Process

1. Create a restore script for emergencies:

```javascript
// scripts/restore-firestore.js
const { admin } = require('../firebaseAdmin');
const fs = require('fs');

async function restoreFirestore(backupFile) {
  try {
    const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    
    for (const [collection, documents] of Object.entries(backup)) {
      const batch = admin.firestore().batch();
      let batchCount = 0;
      
      for (const doc of documents) {
        const ref = admin.firestore().collection(collection).doc(doc.id);
        batch.set(ref, doc.data);
        batchCount++;
        
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log(`Restored ${documents.length} documents to ${collection}`);
    }
    
    console.log('Restore completed successfully');
  } catch (error) {
    console.error('Restore error:', error);
  }
}

// Usage: node restore-firestore.js backup-2023-06-01.json
restoreFirestore(process.argv[2]);
```

## Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Express.js Documentation](https://expressjs.com/)
- [Render Deployment Guide](https://render.com/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## Contact and Support

For issues with the AutoPromote application:

1. Check the troubleshooting guide first
2. Review GitHub issues for similar problems
3. Open a new issue with detailed information
4. For urgent issues, contact the development team directly
