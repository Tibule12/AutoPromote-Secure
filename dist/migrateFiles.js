// File migration script
const fs = require('fs');
const path = require('path');

// List of essential files to copy from the original repository
const filesToCopy = [
  'userRoutes.js',
  'contentRoutes.js',
  'analyticsRoutes.js',
  'adminRoutes.js',
  'adminAnalyticsRoutes.js',
  'userController.js',
  'contentController.js',
  'analyticsController.js',
  'abTestingService.js',
  'contentAnalysisService.js',
  'db.js',
  'authMiddleware.js'
];

// Source and destination directories
const sourceDir = path.resolve(__dirname, '../AutoPromote');
const destDir = path.resolve(__dirname);

// Create directories if they don't exist
const createDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create routes directory
createDir(path.join(destDir, 'routes'));

// Copy files
filesToCopy.forEach(file => {
  try {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    
    // Check if the source file exists
    if (fs.existsSync(sourcePath)) {
      // Read the file content
      const content = fs.readFileSync(sourcePath, 'utf8');
      
      // Write the content to the destination file
      fs.writeFileSync(destPath, content);
      console.log(`✅ Copied ${file} successfully`);
    } else {
      console.error(`❌ Source file not found: ${sourcePath}`);
    }
  } catch (error) {
    console.error(`❌ Error copying ${file}:`, error.message);
  }
});

// Copy routes directory files
const routesDir = path.join(sourceDir, 'routes');
if (fs.existsSync(routesDir)) {
  const routeFiles = fs.readdirSync(routesDir);
  routeFiles.forEach(file => {
    try {
      const sourcePath = path.join(routesDir, file);
      const destPath = path.join(destDir, 'routes', file);
      
      // Check if it's a file (not a directory)
      if (fs.statSync(sourcePath).isFile()) {
        // Read the file content
        const content = fs.readFileSync(sourcePath, 'utf8');
        
        // Write the content to the destination file
        fs.writeFileSync(destPath, content);
        console.log(`✅ Copied routes/${file} successfully`);
      }
    } catch (error) {
      console.error(`❌ Error copying routes/${file}:`, error.message);
    }
  });
} else {
  console.log('ℹ️ Routes directory not found in source repository');
}

console.log('\n🎉 File migration complete!');
