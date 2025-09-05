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
