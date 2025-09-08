const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Files to copy
const filesToCopy = [
  'server.js',
  'authRoutes.js',
  'adminRoutes.js',
  'userRoutes.js',
  'analyticsRoutes.js',
  'adminAnalyticsRoutes.js',
  'contentRoutes.js',
  'stripeOnboardRoutes.js',
  'monetizationRoutes.js',
  'withdrawalRoutes.js',
  'authMiddleware.js',
  'validationMiddleware.js',
  'analyticsController.js',
  'contentController.js',
  'userController.js',
  'abTestingService.js',
  'contentAnalysisService.js',
  'optimizationService.js',
  'promotionService.js',
  'db.js',
  'firebaseAdmin.js',
  'migrateFiles.js',
  'simulate-api.js',
  'test-api.js',
  'test-server.js',
  'package.json',
  'package-lock.json'
];

// Copy files
filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join('dist', file));
    console.log(`Copied ${file} to dist/`);
  } else {
    console.log(`File ${file} not found, skipping`);
  }
});

// Copy .env if it exists
if (fs.existsSync('.env')) {
  fs.copyFileSync('.env', 'dist/.env');
  console.log('Copied .env to dist/');
} else {
  console.log('.env not found, skipping');
}

console.log('Build completed successfully!');
