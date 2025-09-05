# AutoPromote

![GitHub Actions Workflow Status](https://github.com/Tibule12/AutoPromote-Secure/actions/workflows/main.yml/badge.svg)

## Overview
AutoPromote is an AI-powered platform designed to automate content promotion and monetization for creators. The platform enables users to upload their content, including songs, videos, websites, platforms, and pictures, and automatically promote it across various channels to increase views, followers, and revenue.

## 🚀 Key Features
- **AI-Powered Promotion**: Utilize machine learning algorithms to optimize content promotion and targeting across social media platforms, online marketplaces, and advertising networks.
- **Content Upload**: Allow users to upload various types of content, including multimedia files and website links.
- **Automated Monetization**: Integrate advertising, sponsorships, or other revenue-generating models to help creators earn money from their content.
- **Analytics and Insights**: Provide users with detailed analytics and insights on the performance of their content, including views, engagement, and revenue generated.
- **Admin Dashboard**: Comprehensive dashboard for administrators to monitor platform performance, user growth, content metrics, and revenue.

## 🛠️ Technical Stack
- **Frontend**: React.js for a dynamic and responsive user interface
- **Backend**: Node.js with Express for scalable API development
- **Database & Authentication**: Firebase (Firestore for data storage, Firebase Authentication for user management)
- **File Storage**: Firebase Storage for secure content storage
- **Security**: Firebase Security Rules and custom middleware for robust data protection
- **AI Integration**: Machine learning algorithms for content promotion optimization
- **Analytics**: Firebase Analytics for tracking user engagement and content performance
- **Deployment**: Render for continuous deployment

## 🔐 Security Improvements
This repository includes several security enhancements:

- **Environment Variables**: Sensitive credentials are stored as environment variables, not in code
- **Secure Firebase Admin**: Firebase Admin SDK is initialized securely
- **Auth Middleware**: Robust authentication middleware for protected routes
- **CORS Protection**: Properly configured CORS for API security
- **Input Validation**: Server-side validation of user input
- **Error Handling**: Secure error handling that doesn't expose internal details
- **No hardcoded credentials**: All sensitive information is stored in environment variables
- **GitIgnore Configuration**: Added `.env` to `.gitignore` to prevent accidental commits of sensitive data

## 📦 Repository Structure
```
/
├── server.js              # Main application entry point
├── firebaseAdmin.js       # Secure Firebase Admin initialization
├── db.js                  # Database connection and utilities
├── authMiddleware.js      # Authentication middleware
├── authRoutes.js          # Authentication endpoints
├── userRoutes.js          # User management endpoints
├── contentRoutes.js       # Content management endpoints
├── analyticsRoutes.js     # Analytics endpoints
├── adminRoutes.js         # Admin-specific endpoints
├── routes/                # Additional route modules
│   ├── monetizationRoutes.js
│   ├── stripeOnboardRoutes.js
│   └── withdrawalRoutes.js
├── .env.example           # Example environment variables
├── .github/workflows/     # CI/CD configuration
└── package.json           # Node.js dependencies
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- Firebase project
- Firebase service account credentials

### Environment Setup
Copy `.env.example` to `.env` and fill in your Firebase credentials:

```
# Firebase configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key

# Firebase service account (JSON string - escaped)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}
```

### Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/Tibule12/AutoPromote-Secure.git
   cd AutoPromote-Secure
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## 🔄 CI/CD Pipeline
This repository uses GitHub Actions for continuous integration and Render for continuous deployment:

1. **GitHub Actions**: Automatically tests the codebase on push/PR to main branch
2. **Render**: Automatically deploys when changes are pushed to the main branch

## 📝 Deployment

When deploying to services like Render, Heroku, or others, make sure to set the appropriate environment variables in your deployment platform's dashboard.

### Render Deployment Steps
1. Create a new Web Service in Render
2. Connect to your GitHub repository
3. Configure the following settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add the required environment variables in the Render dashboard:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_API_KEY`
   - `FIREBASE_SERVICE_ACCOUNT`
5. Deploy your application

## 🔍 API Documentation
The API provides these main endpoints:

- **Authentication**:
  - `POST /api/auth/register` - Register a new user
  - `POST /api/auth/login` - Login existing user
  - `POST /api/auth/admin-login` - Admin login
  - `GET /api/auth/verify` - Verify token

- **Users**:
  - `GET /api/users/profile` - Get user profile
  - `PUT /api/users/profile` - Update user profile

- **Content**:
  - `POST /api/content` - Upload new content
  - `GET /api/content` - Get user content
  - `GET /api/content/:id` - Get specific content
  - `PUT /api/content/:id` - Update content
  - `DELETE /api/content/:id` - Delete content

- **Analytics**:
  - `GET /api/analytics/user` - Get user analytics
  - `GET /api/analytics/content/:id` - Get content analytics

- **Admin**:
  - `GET /api/admin/users` - Get all users
  - `GET /api/admin/content` - Get all content
  - `GET /api/admin/analytics` - Get platform analytics

## 📊 Potential Revenue Streams
- Transaction Fees: Charge a small fee for each transaction or revenue generated through the platform.
- Premium Features: Offer advanced features and tools for a subscription fee.
- Advertising: Display targeted ads on the platform and earn revenue from clicks or impressions.

## 👥 Target Audience
- Content Creators: Individuals and businesses creating content in various formats, including music, videos, articles, and more.
- Marketers and Advertisers: Businesses and agencies looking to promote their products or services through targeted advertising.

## 🌟 Benefits
- Increased Efficiency: Automate content promotion and monetization, saving time and effort for creators.
- Improved Reach: Expand audience reach through targeted promotion and advertising.
- Revenue Generation: Earn money from content through various revenue-generating models.
- Data-Driven Decisions: Use the admin dashboard to make informed decisions based on comprehensive analytics.
