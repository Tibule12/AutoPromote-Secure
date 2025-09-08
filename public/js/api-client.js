/**
 * API Client for AutoPromote
 * Handles all API communications with the backend
 */

class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL || window.location.origin;
        this.token = null;
        this.init();
    }

    /**
     * Initialize the API client
     */
    init() {
        // Get token from localStorage or AuthHelper
        if (typeof AuthHelper !== 'undefined') {
            this.token = AuthHelper.getStoredToken();
        } else {
            this.token = localStorage.getItem('authToken');
        }
    }

    /**
     * Get authorization headers
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * Make an API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}/api${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return { data, ok: true };
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            return { error: error.message, ok: false };
        }
    }

    /**
     * Verify token
     */
    async verifyToken() {
        return this.request('/auth/verify');
    }

    /**
     * Admin login
     */
    async adminLogin(email, password) {
        const response = await fetch(`${this.baseURL}/api/auth/admin-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Admin login failed');
        }

        // Store token if login successful
        if (data.token) {
            this.token = data.token;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
        }

        return data;
    }

    /**
     * Logout
     */
    logout() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/admin-login';
    }

    /**
     * Get admin overview data
     */
    async getAdminOverview() {
        const result = await this.request('/admin/overview');
        return result.ok ? result.data : null;
    }

    /**
     * Get admin content
     */
    async getAdminContent() {
        const result = await this.request('/admin/content');
        return result.ok ? result.data : null;
    }

    /**
     * Approve content
     */
    async approveContent(contentId) {
        const result = await this.request(`/admin/content/${contentId}/approve`, {
            method: 'POST'
        });
        return result.ok ? result.data : null;
    }

    /**
     * Decline content
     */
    async declineContent(contentId) {
        const result = await this.request(`/admin/content/${contentId}/decline`, {
            method: 'POST'
        });
        return result.ok ? result.data : null;
    }

    /**
     * Update user role
     */
    async updateUserRole(userId, role) {
        const result = await this.request(`/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role })
        });
        return result.ok ? result.data : null;
    }

    /**
     * Delete user
     */
    async deleteUser(userId) {
        const result = await this.request(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
        return result.ok ? result.data : null;
    }

    /**
     * Get admin analytics
     */
    async getAdminAnalytics(period = '7d') {
        const result = await this.request(`/admin/analytics?period=${period}`);
        return result.ok ? result.data : null;
    }

    /**
     * Upload content
     */
    async uploadContent(formData) {
        const url = `${this.baseURL}/api/content/upload`;
        const config = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
                // Don't set Content-Type for FormData, let browser set it
            },
            body: formData
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return { data, ok: true };
        } catch (error) {
            console.error('Upload failed:', error);
            return { error: error.message, ok: false };
        }
    }

    /**
     * Get user content
     */
    async getUserContent() {
        const result = await this.request('/content/user');
        return result.ok ? result.data : null;
    }

    /**
     * Delete user content
     */
    async deleteContent(contentId) {
        const result = await this.request(`/content/${contentId}`, {
            method: 'DELETE'
        });
        return result.ok ? result.data : null;
    }

    /**
     * Get user analytics
     */
    async getUserAnalytics() {
        const result = await this.request('/analytics/user');
        return result.ok ? result.data : null;
    }

    /**
     * Update user profile
     */
    async updateProfile(profileData) {
        const result = await this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        return result.ok ? result.data : null;
    }
}

// Create global API client instance
const api = new APIClient();
