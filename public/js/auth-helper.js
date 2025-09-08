/**
 * Auth Helper for AutoPromote
 * Handles authentication token and user data storage/retrieval
 */

class AuthHelper {
    constructor() {
        this.tokenKey = 'authToken';
        this.userDataKey = 'userData';
    }

    /**
     * Store authentication token
     */
    storeToken(token) {
        if (token) {
            localStorage.setItem(this.tokenKey, token);
        }
    }

    /**
     * Get stored authentication token
     */
    getStoredToken() {
        return localStorage.getItem(this.tokenKey);
    }

    /**
     * Remove stored authentication token
     */
    removeToken() {
        localStorage.removeItem(this.tokenKey);
    }

    /**
     * Store user data
     */
    storeUserData(userData) {
        if (userData) {
            localStorage.setItem(this.userDataKey, JSON.stringify(userData));
        }
    }

    /**
     * Get stored user data
     */
    getStoredUserData() {
        const userData = localStorage.getItem(this.userDataKey);
        return userData ? JSON.parse(userData) : null;
    }

    /**
     * Remove stored user data
     */
    removeUserData() {
        localStorage.removeItem(this.userDataKey);
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = this.getStoredToken();
        const userData = this.getStoredUserData();
        return !!(token && userData);
    }

    /**
     * Check if user is admin
     */
    isAdmin() {
        const userData = this.getStoredUserData();
        return userData && (userData.isAdmin === true || userData.role === 'admin');
    }

    /**
     * Clear all authentication data
     */
    clearAuthData() {
        this.removeToken();
        this.removeUserData();
    }

    /**
     * Get user ID
     */
    getUserId() {
        const userData = this.getStoredUserData();
        return userData ? userData.uid : null;
    }

    /**
     * Get user name
     */
    getUserName() {
        const userData = this.getStoredUserData();
        return userData ? (userData.name || userData.email) : null;
    }

    /**
     * Get user email
     */
    getUserEmail() {
        const userData = this.getStoredUserData();
        return userData ? userData.email : null;
    }

    /**
     * Get user role
     */
    getUserRole() {
        const userData = this.getStoredUserData();
        return userData ? userData.role : null;
    }

    /**
     * Update stored user data
     */
    updateUserData(updates) {
        const currentData = this.getStoredUserData();
        if (currentData) {
            const updatedData = { ...currentData, ...updates };
            this.storeUserData(updatedData);
        }
    }

    /**
     * Logout user
     */
    logout() {
        this.clearAuthData();
        // Redirect to login page
        window.location.href = '/admin-login';
    }

    /**
     * Validate token format (basic validation)
     */
    isValidToken(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }

        // Basic JWT format validation
        const parts = token.split('.');
        return parts.length === 3;
    }

    /**
     * Check if token is expired (basic check)
     */
    isTokenExpired(token) {
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            return payload.exp < currentTime;
        } catch (error) {
            console.error('Error checking token expiration:', error);
            return true;
        }
    }
}

// Create global AuthHelper instance
const AuthHelper = new AuthHelper();
