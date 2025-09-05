# Setup GitHub Pages for AutoPromote-Secure
# This PowerShell script sets up and maintains the gh-pages branch for documentation

$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($message) {
    Write-ColorOutput Green $message
}

function Write-Error($message) {
    Write-ColorOutput Red $message
}

function Write-Info($message) {
    Write-ColorOutput Cyan $message
}

# Check if we're in the repository root
if (-not (Test-Path ".git")) {
    Write-Error "This script must be run from the repository root."
    exit 1
}

# Ensure we have the docs directory
if (-not (Test-Path "docs")) {
    mkdir docs | Out-Null
    Write-Info "Created docs directory"
}

# Record the current branch
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Info "Current branch is $currentBranch"

# Check if gh-pages branch exists locally
$branchExists = git show-ref --verify --quiet refs/heads/gh-pages
if ($LASTEXITCODE -eq 0) {
    Write-Info "gh-pages branch already exists locally."
} else {
    # Create gh-pages branch
    Write-Info "Creating gh-pages branch..."
    git checkout --orphan gh-pages
    git rm -rf .
    git clean -fdx
    echo "# AutoPromote-Secure Documentation" > README.md
    git add README.md
    git commit -m "Initial gh-pages commit"
    # Return to original branch
    git checkout $currentBranch
    Write-Success "Created gh-pages branch."
}

# Setup documentation files
Write-Info "Creating documentation files..."

# Create base documentation if it doesn't exist
if (-not (Test-Path "docs\index.md")) {
    @"
# AutoPromote-Secure Documentation

## Overview
AutoPromote-Secure is an enhanced version of the AutoPromote system with improved security features, focusing on secure Firebase Admin SDK integration and robust authentication.

## Features
- Secure Firebase Admin SDK integration
- Enhanced authentication flow
- Improved content promotion security
- Admin role-based access control
- Secure API endpoints

## Security Enhancements

### Firebase Admin Configuration
- Secure storage of Firebase credentials
- Environment variable management
- Custom token generation and validation

### Authentication
- Enhanced JWT verification
- Role-based access control
- Admin credential validation

### API Security
- Request validation middleware
- Input sanitization
- Cross-Origin Resource Sharing (CORS) configuration

## API Endpoints

### Health Check
- `GET /api/health` - Check if the API is running

### Content Endpoints
- `GET /api/content` - List all content (authenticated)
- `POST /api/content` - Create new content (authenticated)
- `GET /api/content/:id` - Get specific content (authenticated)
- `PUT /api/content/:id` - Update content (authenticated admin)
- `DELETE /api/content/:id` - Delete content (authenticated admin)

### Admin Endpoints
- `GET /api/admin/dashboard` - Get admin dashboard data (admin only)
- `POST /api/admin/promote` - Manually promote content (admin only)

## Deployment
The application is deployed on Render with secure environment configuration.
"@ | Out-File -FilePath "docs\index.md" -Encoding utf8
    Write-Info "Created index.md"
}

if (-not (Test-Path "docs\security.md")) {
    @"
# Security Configuration Guide

## Firebase Admin SDK Configuration

### Secure Credential Storage
Firebase Admin SDK credentials should be stored securely as environment variables or secret management systems, never in your codebase.

### Setting Up Environment Variables

#### Local Development
Create a `.env` file in your project root:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key...\n-----END PRIVATE KEY-----\n"
```

**Important:** Add `.env` to your `.gitignore` file to prevent accidental commits.

#### Production Environment
For Render or other cloud platforms, set these variables in the service configuration panel.

### Initializing Firebase Admin SDK Securely

```javascript
// firebaseAdmin.js
const admin = require('firebase-admin');
require('dotenv').config();

// Extract environment variables
const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY
} = process.env;

// Validate required configuration
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('❌ Missing Firebase Admin SDK credentials in environment variables');
  process.exit(1); // Exit with error
}

// Initialize with environment variables
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines in the private key
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization error:', error.message);
  process.exit(1); // Exit with error
}

// Export the initialized services
module.exports = {
  admin,
  auth: admin.auth(),
  db: admin.firestore(),
  storage: admin.storage()
};
```

## Authentication Security

### JSON Web Token (JWT) Verification

Implement robust middleware for verifying authentication tokens:

```javascript
// authMiddleware.js
const { auth } = require('./firebaseAdmin');

const verifyAuthToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication token is required' 
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Add user information to the request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'user'
    };
    
    next();
  } catch (error) {
    console.error('Auth token verification error:', error.message);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'TokenExpired', 
        message: 'Your session has expired. Please login again.' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid authentication token' 
    });
  }
};

module.exports = { verifyAuthToken };
```

### Role-Based Access Control

```javascript
// authMiddleware.js (continued)
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }
  next();
};

module.exports = { verifyAuthToken, requireAdmin };
```

## API Security

### Input Validation Middleware

```javascript
// validationMiddleware.js
const { body, validationResult } = require('express-validator');

const validateContentCreate = [
  body('title').trim().isLength({ min: 3, max: 100 }).escape(),
  body('description').trim().isLength({ min: 10, max: 500 }).escape(),
  body('type').isIn(['article', 'video', 'image']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation Error', 
        details: errors.array() 
      });
    }
    next();
  }
];

module.exports = { validateContentCreate };
```

### CORS Configuration

```javascript
// server.js
const cors = require('cors');

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-frontend-domain.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
```

## Security Best Practices

1. **Keep Dependencies Updated**: Regularly run `npm audit` and update vulnerable packages
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **HTTPS Only**: Enforce HTTPS in production
4. **Helmet.js**: Use Helmet.js to set secure HTTP headers
5. **Content Security Policy**: Implement CSP to prevent XSS attacks
6. **Log Sanitization**: Ensure sensitive data is not logged
7. **Regular Security Audits**: Conduct regular security reviews
"@ | Out-File -FilePath "docs\security.md" -Encoding utf8
    Write-Info "Created security.md"
}

# Create index.html for GitHub Pages
if (-not (Test-Path "docs\index.html")) {
    @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoPromote-Secure Documentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.1.0/github-markdown.min.css">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        a {
            color: #3498db;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .nav-container {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .nav-list {
            list-style-type: none;
            padding: 0;
        }
        .nav-list li {
            margin-bottom: 10px;
        }
        .content {
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
        }
        @media (max-width: 767px) {
            .markdown-body {
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="nav-container">
        <h2>Documentation Navigation</h2>
        <ul class="nav-list">
            <li><a href="index.md">Home - Overview</a></li>
            <li><a href="security.md">Security Configuration Guide</a></li>
            <li><a href="render-port-config.md">Render Port Configuration</a></li>
            <li><a href="quick-fix-port.md">Quick Fix: Port Issue</a></li>
            <li><a href="home.html">Documentation Home</a></li>
        </ul>
    </div>
    
    <div class="content">
        <div id="markdown-content" class="markdown-body"></div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Fetch the index.md file and render it
            fetch('index.md')
                .then(response => response.text())
                .then(markdown => {
                    document.getElementById('markdown-content').innerHTML = marked.parse(markdown);
                })
                .catch(error => {
                    console.error('Error fetching Markdown:', error);
                    document.getElementById('markdown-content').innerHTML = `
                        <h1>AutoPromote-Secure Documentation</h1>
                        <p>Welcome to the AutoPromote-Secure documentation.</p>
                        <p>Please use the navigation links above to browse the documentation.</p>
                        <p>If you're having trouble viewing the content, you can directly access <a href="home.html">the documentation home page</a>.</p>
                    `;
                });
        });
    </script>
</body>
</html>
"@ | Out-File -FilePath "docs\index.html" -Encoding utf8
    Write-Info "Created index.html"
}

# Create home.html for navigation
if (-not (Test-Path "docs\home.html")) {
    @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoPromote-Secure Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        a {
            color: #3498db;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .nav-container {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .nav-list {
            list-style-type: none;
            padding: 0;
        }
        .nav-list li {
            margin-bottom: 10px;
        }
        .content {
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .security-note {
            background-color: #f8d7da;
            border-left: 4px solid #d73a49;
            padding: 10px 15px;
            margin: 20px 0;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="nav-container">
        <h2>Documentation Navigation</h2>
        <ul class="nav-list">
            <li><a href="index.html">Home</a></li>
            <li><a href="index.md">Overview</a></li>
            <li><a href="security.md">Security Configuration Guide</a></li>
            <li><a href="render-port-config.md">Render Port Configuration</a></li>
            <li><a href="quick-fix-port.md">Quick Fix: Port Issue</a></li>
        </ul>
    </div>
    
    <div class="content">
        <h1>AutoPromote-Secure Documentation</h1>
        <p>Welcome to the AutoPromote-Secure documentation. This is an enhanced version of the AutoPromote system with improved security features and configurations.</p>
        
        <div class="security-note">
            <h3>Security First</h3>
            <p>AutoPromote-Secure prioritizes security in all aspects of the application. Always follow the security best practices documented in the security guide.</p>
        </div>
        
        <h2>About AutoPromote-Secure</h2>
        <p>AutoPromote-Secure is a secure content promotion system that helps optimize content delivery based on performance metrics while maintaining strong security controls. It includes enhanced features for secure Firebase Admin SDK integration, improved authentication flow, and robust API security.</p>
        
        <h2>Quick Links</h2>
        <ul>
            <li><a href="https://github.com/Tibule12/AutoPromote-Secure" target="_blank">GitHub Repository</a></li>
        </ul>
    </div>
</body>
</html>
"@ | Out-File -FilePath "docs\home.html" -Encoding utf8
    Write-Info "Created home.html"
}

# Switch to gh-pages branch
git checkout gh-pages

# Remove all files
git rm -rf .
git clean -fdx

# Copy all the docs to the root of gh-pages branch
Copy-Item -Path docs\* -Destination . -Recurse

# Add all files
git add .

# Commit changes
git commit -m "Update GitHub Pages documentation"

# Force push to gh-pages branch
Write-Info "Force pushing to gh-pages branch..."
try {
    git push -f origin gh-pages
    Write-Success "Documentation branch setup complete!"
    Write-Success "Your documentation will be available at:"
    Write-Success "https://tibule12.github.io/AutoPromote-Secure/"
} catch {
    Write-Error "Failed to push to gh-pages branch: $_"
    Write-Info "You may need to force push manually with: git push -f origin gh-pages"
}

# Return to the original branch
git checkout $currentBranch
Write-Success "Returned to $currentBranch branch"
