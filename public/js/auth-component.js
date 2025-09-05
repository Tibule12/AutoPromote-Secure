/**
 * Authentication Component for Admin Dashboard
 * Handles authentication state, token verification, and user session management
 */

class AuthComponent {
    constructor(redirectUrl = '/admin-login') {
        this.redirectUrl = redirectUrl;
        this.userData = null;
        this.isAuthenticated = false;
        this.isAdmin = false;
        
        // Initialize the component
        this.init();
    }
    
    /**
     * Initialize the component
     */
    async init() {
        try {
            // Check if the user is authenticated
            await this.checkAuthState();
        } catch (error) {
            console.error('Auth component initialization error:', error);
            this.redirectToLogin();
        }
    }
    
    /**
     * Check the current authentication state
     * @returns {Promise<boolean>} Whether the user is authenticated
     */
    async checkAuthState() {
        // Get the token
        const token = this.getToken();
        
        if (!token) {
            this.isAuthenticated = false;
            this.isAdmin = false;
            return false;
        }
        
        try {
            // Verify the token with the server
            const { data, ok } = await api.verifyToken();
            
            if (ok && data.valid) {
                this.userData = data.user;
                this.isAuthenticated = true;
                this.isAdmin = data.user.isAdmin === true || data.user.role === 'admin';
                
                // Update the stored user data
                if (typeof AuthHelper !== 'undefined') {
                    AuthHelper.storeUserData(data.user);
                } else {
                    localStorage.setItem('userData', JSON.stringify(data.user));
                }
                
                // Redirect admin users to admin dashboard
                if (this.isAdmin && window.location.pathname !== '/admin-dashboard') {
                    window.location.href = '/admin-dashboard';
                }
                
                return true;
            } else {
                this.isAuthenticated = false;
                this.isAdmin = false;
                return false;
            }
        } catch (error) {
            console.error('Token verification error:', error);
            this.isAuthenticated = false;
            this.isAdmin = false;
            return false;
        }
    }
    
    /**
     * Get the authentication token
     * @returns {string|null} The authentication token or null if not available
     */
    getToken() {
        // Use AuthHelper if available, otherwise fall back to localStorage
        if (typeof AuthHelper !== 'undefined') {
            return AuthHelper.getStoredToken();
        }
        return localStorage.getItem('authToken');
    }
    
    /**
     * Get the user data
     * @returns {Object|null} The user data or null if not available
     */
    getUserData() {
        if (this.userData) {
            return this.userData;
        }
        
        // Use AuthHelper if available, otherwise fall back to localStorage
        if (typeof AuthHelper !== 'undefined') {
            return AuthHelper.getStoredUserData();
        }
        
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }
    
    /**
     * Check if the user is authenticated
     * @returns {boolean} Whether the user is authenticated
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }
    
    /**
     * Check if the user is an admin
     * @returns {boolean} Whether the user is an admin
     */
    isUserAdmin() {
        return this.isAdmin;
    }
    
    /**
     * Redirect to the login page
     */
    redirectToLogin() {
        window.location.href = this.redirectUrl;
    }
    
    /**
     * Logout the current user
     */
    logout() {
        api.logout();
        this.isAuthenticated = false;
        this.isAdmin = false;
        this.userData = null;
        this.redirectToLogin();
    }
    
    /**
     * Require authentication for the current page
     * @param {boolean} requireAdmin - Whether admin privileges are required
     */
    requireAuth(requireAdmin = false) {
        if (!this.isAuthenticated) {
            this.redirectToLogin();
            return;
        }
        
        if (requireAdmin && !this.isAdmin) {
            // Redirect to a forbidden page or display an error
            alert('You do not have permission to access this page.');
            window.location.href = '/';
        }
    }
}

// Create a global auth component instance
const auth = new AuthComponent();
