# AutoPromote Testing & Deployment Checklist

This document provides a comprehensive checklist for testing and deploying the AutoPromote application.

## Pre-Deployment Testing

### Local Environment Testing

- [ ] **Environment Variables**
  - [ ] Verify all required environment variables are set (see `.env.example`)
  - [ ] Ensure Firebase service account credentials are valid
  - [ ] Check for any hardcoded credentials in the codebase

- [ ] **Firebase Connectivity**
  - [ ] Run `node check-firebase-setup.js` to verify Firebase connectivity
  - [ ] Test Firebase authentication using `node firebase-auth-test.js`
  - [ ] Verify Firestore read/write permissions with `node check-firestore-permissions.js`

- [ ] **API Endpoints**
  - [ ] Test authentication endpoints with `curl` or Postman
  - [ ] Verify user routes function correctly
  - [ ] Check content upload, retrieval, and management
  - [ ] Test analytics endpoints
  - [ ] Verify admin routes and permissions

- [ ] **Error Handling**
  - [ ] Test invalid authentication scenarios
  - [ ] Verify validation middleware rejects invalid inputs
  - [ ] Check that error responses follow the expected format
  - [ ] Ensure sensitive errors are not exposed in production mode

- [ ] **Module Dependencies**
  - [ ] Verify all required modules are present in the codebase
  - [ ] Check for circular dependencies
  - [ ] Run `npm ls` to identify any missing or outdated dependencies

## CI/CD Pipeline Testing

- [ ] **GitHub Actions**
  - [ ] Verify workflow triggers on push to main branch
  - [ ] Check that the build job completes successfully
  - [ ] Verify Node.js syntax validation passes
  - [ ] Ensure the deployment notification runs correctly

- [ ] **Deployment Hooks**
  - [ ] Test Render deploy hook if configured
  - [ ] Verify the deployment triggers when pushing to the main branch

## Render Deployment

- [ ] **Environment Setup**
  - [ ] Configure all required environment variables in Render dashboard
  - [ ] Ensure Firebase service account JSON is properly formatted as a single line
  - [ ] Set Node.js version to match local development environment

- [ ] **Deployment Configuration**
  - [ ] Verify build command is set to `npm install`
  - [ ] Check start command is set to `node server.js`
  - [ ] Configure appropriate instance type based on expected load
  - [ ] Set up health check URL to `/api/health`

- [ ] **Post-Deployment Testing**
  - [ ] Verify the application starts without errors
  - [ ] Test `/api/health` endpoint returns a 200 status
  - [ ] Validate that Firebase Admin initializes successfully
  - [ ] Test authentication with production deployment
  - [ ] Verify content upload and retrieval in production
  - [ ] Check CORS configuration allows expected origins

## Common Deployment Issues

### Module Not Found Errors

- [ ] **Missing Files**
  - [ ] Check that all required modules and service files exist in the repository
  - [ ] Verify imported files have correct names (case-sensitive)
  - [ ] Compare with the repository structure to identify missing files

### Firebase Admin Initialization Issues

- [ ] **Credentials**
  - [ ] Verify `FIREBASE_SERVICE_ACCOUNT` is properly formatted as a single-line JSON string
  - [ ] Check that the Firebase project ID matches the one in your service account
  - [ ] Ensure service account has necessary permissions

### Database Connection Errors

- [ ] **Firestore Security Rules**
  - [ ] Verify Firestore security rules allow the operations
  - [ ] Check that collections referenced in the code exist
  - [ ] Ensure service account has appropriate roles assigned

## Security Checks

- [ ] **Dependency Vulnerabilities**
  - [ ] Run `npm audit` to identify potential vulnerabilities
  - [ ] Update dependencies with known security issues

- [ ] **Authentication**
  - [ ] Verify JWT tokens have appropriate expiration times
  - [ ] Check for proper validation of user roles and permissions
  - [ ] Ensure admin routes are properly protected

- [ ] **Data Validation**
  - [ ] Test input validation on all API endpoints
  - [ ] Verify sanitization of user input
  - [ ] Check for proper handling of file uploads

## Performance Checks

- [ ] **Response Times**
  - [ ] Measure API response times for critical endpoints
  - [ ] Check for any slow database queries
  - [ ] Verify handling of large file uploads

- [ ] **Scaling**
  - [ ] Test application with simulated load
  - [ ] Verify connection pooling is properly configured
  - [ ] Check for memory leaks during extended operation

## Post-Deployment Monitoring

- [ ] **Logging**
  - [ ] Verify application logs are properly captured
  - [ ] Set up alerts for critical errors

- [ ] **Performance Monitoring**
  - [ ] Configure monitoring for API response times
  - [ ] Set up alerts for unusual traffic patterns

- [ ] **Security Monitoring**
  - [ ] Monitor for unusual authentication patterns
  - [ ] Set up alerts for potential security breaches

## Rollback Plan

- [ ] **Backup**
  - [ ] Create a backup of production data before major updates
  - [ ] Document the steps to restore from backup

- [ ] **Version Control**
  - [ ] Tag release versions in Git
  - [ ] Document the steps to deploy a previous version

- [ ] **Database Migrations**
  - [ ] Create a plan to revert database changes if needed
  - [ ] Test the rollback process in a staging environment

## Final Checklist

- [ ] All tests pass
- [ ] No deployment errors in logs
- [ ] Health check endpoint returns success
- [ ] Authentication works correctly
- [ ] Content can be uploaded and retrieved
- [ ] Admin functionality works as expected
- [ ] Application performs within expected parameters
- [ ] No security vulnerabilities detected
