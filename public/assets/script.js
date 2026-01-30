// ==================== CONFIGURATION ====================
const CONFIG = {
    API_BASE: '/api',
    AUTO_REFRESH_INTERVAL: 3000, // 3 seconds
    SESSION_TIMEOUT: 86400000, // 24 hours in milliseconds
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    DEBUG_MODE: false
};

// ==================== UTILITY FUNCTIONS ====================
class Utils {
    // Logging utility
    static log(...args) {
        if (CONFIG.DEBUG_MODE) {
            console.log('[StudentForm]', ...args);
        }
    }

    static error(...args) {
        console.error('[StudentForm]', ...args);
    }

    // Format date
    static formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('hi-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch (error) {
            return dateString;
        }
    }

    // Format mobile number
    static formatMobile(mobile) {
        if (!mobile) return 'N/A';
        const cleaned = mobile.toString().replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `${cleaned.substring(0,5)} ${cleaned.substring(5)}`;
        }
        return mobile;
    }

    // Format Aadhar number
    static formatAadhar(aadhar) {
        if (!aadhar) return 'N/A';
        const cleaned = aadhar.toString().replace(/\D/g, '');
        if (cleaned.length === 12) {
            return `${cleaned.substring(0,4)} ${cleaned.substring(4,8)} ${cleaned.substring(8)}`;
        }
        return aadhar;
    }

    // Validate form data
    static validateFormData(formData) {
        const errors = [];

        // Name validation
        if (!formData.name || formData.name.trim().length < 2) {
            errors.push('नाम कम से कम 2 अक्षर का होना चाहिए');
        }

        // Date of birth validation
        if (!formData.dob) {
            errors.push('जन्म तिथि आवश्यक है');
        } else {
            const dob = new Date(formData.dob);
            const today = new Date();
            if (dob > today) {
                errors.push('जन्म तिथि भविष्य की नहीं हो सकती');
            }
        }

        // Mobile validation
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!formData.mobile || !mobileRegex.test(formData.mobile.toString().replace(/\D/g, ''))) {
            errors.push('मान्य मोबाइल नंबर दर्ज करें');
        }

        // Father's name validation
        if (!formData.father || formData.father.trim().length < 2) {
            errors.push('पिता का नाम कम से कम 2 अक्षर का होना चाहिए');
        }

        // Aadhar validation
        const aadharRegex = /^\d{12}$/;
        if (!formData.aadhar || !aadharRegex.test(formData.aadhar.toString().replace(/\D/g, ''))) {
            errors.push('मान्य 12-अंकीय आधार नंबर दर्ज करें');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Show alert message
    static showAlert(type, message, duration = 5000) {
        // Remove existing alerts
        const existingAlert = document.querySelector('.global-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `global-alert alert alert-${type}`;
        alertDiv.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
                <button class="alert-close"><i class="fas fa-times"></i></button>
            </div>
        `;

        // Add to body
        document.body.appendChild(alertDiv);

        // Add close functionality
        const closeBtn = alertDiv.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => {
            alertDiv.remove();
        });

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, duration);
        }

        // Add styles if not present
        if (!document.querySelector('#alert-styles')) {
            const style = document.createElement('style');
            style.id = 'alert-styles';
            style.textContent = `
                .global-alert {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    min-width: 300px;
                    max-width: 500px;
                    animation: slideIn 0.3s ease;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                }
                .alert-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 15px;
                }
                .alert-close {
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    margin-left: auto;
                    opacity: 0.7;
                    transition: opacity 0.3s;
                }
                .alert-close:hover {
                    opacity: 1;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Show loading spinner
    static showLoading(container, message = 'Loading...') {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;

        // Add styles if not present
        if (!document.querySelector('#loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                .loading-spinner {
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                .loading-spinner .spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 15px;
                }
                .loading-spinner p {
                    margin: 0;
                    color: #333;
                    font-weight: 500;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(loadingDiv);
        return loadingDiv;
    }

    // Hide loading spinner
    static hideLoading(loadingDiv) {
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.remove();
        }
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Get time ago
    static getTimeAgo(timestamp) {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return `${interval} year${interval > 1 ? 's' : ''} ago`;
        
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return `${interval} month${interval > 1 ? 's' : ''} ago`;
        
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return `${interval} day${interval > 1 ? 's' : ''} ago`;
        
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return `${interval} hour${interval > 1 ? 's' : ''} ago`;
        
        interval = Math.floor(seconds / 60);
        if (interval >= 1) return `${interval} minute${interval > 1 ? 's' : ''} ago`;
        
        return 'Just now';
    }

    // Copy to clipboard
    static copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text)
                    .then(resolve)
                    .catch(reject);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    resolve();
                } catch (err) {
                    reject(err);
                }
                document.body.removeChild(textArea);
            }
        });
    }
}

// ==================== API SERVICE ====================
class ApiService {
    constructor() {
        this.baseUrl = CONFIG.API_BASE;
        this.retryCount = 0;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        };

        const requestOptions = { ...defaultOptions, ...options };

        try {
            Utils.log(`API Request: ${endpoint}`, requestOptions);
            const response = await fetch(url, requestOptions);
            
            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || 1;
                await this.sleep(retryAfter * 1000);
                return this.request(endpoint, options);
            }

            // Handle unauthorized
            if (response.status === 401) {
                if (window.location.pathname.includes('admin')) {
                    localStorage.removeItem('adminLoggedIn');
                    window.location.reload();
                }
                throw new Error('Unauthorized');
            }

            const data = await response.json();
            Utils.log(`API Response: ${endpoint}`, data);

            if (!response.ok) {
                throw new Error(data.error || `API Error: ${response.status}`);
            }

            this.retryCount = 0;
            return data;

        } catch (error) {
            Utils.error(`API Error (${endpoint}):`, error);
            
            // Retry logic
            if (this.retryCount < CONFIG.MAX_RETRIES) {
                this.retryCount++;
                await this.sleep(CONFIG.RETRY_DELAY * this.retryCount);
                return this.request(endpoint, options);
            }
            
            throw error;
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Form submission
    async submitForm(formData) {
        return this.request('/submit', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
    }

    // Get all responses
    async getResponses() {
        return this.request('/responses');
    }

    // Admin login
    async login(password) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
    }

    // Check login status
    async checkLogin() {
        return this.request('/login');
    }

    // Export data
    async exportData(format = 'csv') {
        return this.request(`/export?format=${format}`);
    }
}

// ==================== FORM HANDLER ====================
class FormHandler {
    constructor() {
        this.api = new ApiService();
        this.form = document.getElementById('studentForm');
        this.init();
    }

    init() {
        if (!this.form) return;

        // Add form validation styles
        this.addValidationStyles();

        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Real-time validation
        this.addRealTimeValidation();

        // Auto-format inputs
        this.addAutoFormatting();

        Utils.log('Form handler initialized');
    }

    addValidationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .valid-feedback {
                color: #2ecc71;
                font-size: 12px;
                margin-top: 5px;
                display: none;
            }
            .invalid-feedback {
                color: #e74c3c;
                font-size: 12px;
                margin-top: 5px;
                display: none;
            }
            .is-valid {
                border-color: #2ecc71 !important;
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath fill='%232ecc71' d='M2.3 6.73L.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e");
                background-repeat: no-repeat;
                background-position: right calc(0.375em + 0.1875rem) center;
                background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
            }
            .is-invalid {
                border-color: #e74c3c !important;
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23e74c3c'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23e74c3c' stroke='none'/%3e%3c/svg%3e");
                background-repeat: no-repeat;
                background-position: right calc(0.375em + 0.1875rem) center;
                background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
            }
        `;
        document.head.appendChild(style);
    }

    addRealTimeValidation() {
        const inputs = this.form.querySelectorAll('input[required]');
        inputs.forEach(input => {
            // Blur validation
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            // Input validation (for immediate feedback)
            input.addEventListener('input', () => {
                if (input.value.trim() !== '') {
                    this.validateField(input);
                }
            });
        });
    }

    addAutoFormatting() {
        // Mobile number formatting
        const mobileInput = this.form.querySelector('input[name="mobile"]');
        if (mobileInput) {
            mobileInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 10) value = value.substring(0, 10);
                e.target.value = value;
            });
        }

        // Aadhar number formatting
        const aadharInput = this.form.querySelector('input[name="aadhar"]');
        if (aadharInput) {
            aadharInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 12) value = value.substring(0, 12);
                e.target.value = value;
            });
        }

        // Name capitalization
        const nameInput = this.form.querySelector('input[name="name"]');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\b\w/g, char => char.toUpperCase());
            });
        }

        // Father's name capitalization
        const fatherInput = this.form.querySelector('input[name="father"]');
        if (fatherInput) {
            fatherInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\b\w/g, char => char.toUpperCase());
            });
        }
    }

    validateField(input) {
        const value = input.value.trim();
        const fieldName = input.name;
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'name':
            case 'father':
                if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'कम से कम 2 अक्षर आवश्यक';
                }
                break;

            case 'mobile':
                const mobileRegex = /^[6-9]\d{9}$/;
                if (!mobileRegex.test(value.replace(/\D/g, ''))) {
                    isValid = false;
                    errorMessage = 'मान्य मोबाइल नंबर दर्ज करें';
                }
                break;

            case 'aadhar':
                const aadharRegex = /^\d{12}$/;
                if (!aadharRegex.test(value.replace(/\D/g, ''))) {
                    isValid = false;
                    errorMessage = 'मान्य 12-अंकीय आधार नंबर';
                }
                break;

            case 'dob':
                if (!value) {
                    isValid = false;
                    errorMessage = 'जन्म तिथि आवश्यक है';
                } else {
                    const dob = new Date(value);
                    const today = new Date();
                    if (dob > today) {
                        isValid = false;
                        errorMessage = 'भविष्य की तिथि नहीं हो सकती';
                    }
                }
                break;
        }

        // Update UI
        this.updateFieldValidation(input, isValid, errorMessage);
        return isValid;
    }

    updateFieldValidation(input, isValid, message) {
        // Remove existing feedback
        const existingFeedback = input.parentNode.querySelector('.valid-feedback, .invalid-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        // Update input classes
        input.classList.remove('is-valid', 'is-invalid');
        input.classList.add(isValid ? 'is-valid' : 'is-invalid');

        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = isValid ? 'valid-feedback' : 'invalid-feedback';
        feedback.textContent = isValid ? '✓ सही है' : message;
        feedback.style.display = 'block';

        // Insert after input
        input.parentNode.appendChild(feedback);
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        // Validate all fields
        const inputs = this.form.querySelectorAll('input[required]');
        let allValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                allValid = false;
            }
        });

        if (!allValid) {
            Utils.showAlert('error', 'कृपया सभी फ़ील्ड सही से भरें');
            return;
        }

        // Collect form data
        const formData = {
            name: this.form.querySelector('[name="name"]').value.trim(),
            dob: this.form.querySelector('[name="dob"]').value,
            mobile: this.form.querySelector('[name="mobile"]').value.replace(/\D/g, ''),
            father: this.form.querySelector('[name="father"]').value.trim(),
            aadhar: this.form.querySelector('[name="aadhar"]').value.replace(/\D/g, '')
        };

        // Validate complete data
        const validation = Utils.validateFormData(formData);
        if (!validation.isValid) {
            Utils.showAlert('error', validation.errors[0]);
            return;
        }

        // Show loading
        const loading = Utils.showLoading(null, 'Form submitting...');

        try {
            // Submit form
            const result = await this.api.submitForm(formData);
            
            if (result.success) {
                // Success
                Utils.showAlert('success', '✅ Form successfully submitted!');
                
                // Reset form
                this.form.reset();
                
                // Remove validation classes
                this.form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
                    el.classList.remove('is-valid', 'is-invalid');
                });
                
                // Remove feedback messages
                this.form.querySelectorAll('.valid-feedback, .invalid-feedback').forEach(el => {
                    el.remove();
                });
                
                // Optional: Show success animation
                this.showSuccessAnimation();
                
            } else {
                throw new Error(result.error || 'Submission failed');
            }
            
        } catch (error) {
            Utils.showAlert('error', `Submission failed: ${error.message}`);
            Utils.error('Form submission error:', error);
            
        } finally {
            Utils.hideLoading(loading);
        }
    }

    showSuccessAnimation() {
        const formContainer = this.form.closest('.form-container');
        if (!formContainer) return;

        // Create success overlay
        const overlay = document.createElement('div');
        overlay.className = 'success-overlay';
        overlay.innerHTML = `
            <div class="success-content">
                <div class="success-icon">✓</div>
                <h3>Success!</h3>
                <p>Form submitted successfully</p>
            </div>
        `;

        // Add styles
        if (!document.querySelector('#success-styles')) {
            const style = document.createElement('style');
            style.id = 'success-styles';
            style.textContent = `
                .success-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(76, 175, 80, 0.95);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    border-radius: 20px;
                    animation: fadeIn 0.3s ease;
                }
                .success-content {
                    text-align: center;
                    color: white;
                    animation: bounceIn 0.5s ease;
                }
                .success-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                    animation: scaleUp 0.5s ease;
                }
                .success-content h3 {
                    font-size: 24px;
                    margin-bottom: 10px;
                }
                @keyframes bounceIn {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes scaleUp {
                    0% { transform: scale(0); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        formContainer.style.position = 'relative';
        formContainer.appendChild(overlay);

        // Remove after animation
        setTimeout(() => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
            }, 500);
        }, 1500);
    }
}

// ==================== ADMIN DASHBOARD ====================
class AdminDashboard {
    constructor() {
        this.api = new ApiService();
        this.responses = [];
        this.autoRefreshInterval = null;
        this.lastUpdateTime = null;
        this.init();
    }

    async init() {
        // Check login status
        await this.checkLogin();
        
        // Initialize UI
        this.initializeUI();
        
        // Start auto-refresh
        this.startAutoRefresh();
        
        // Update form URL
        this.updateFormUrl();
        
        Utils.log('Admin dashboard initialized');
    }

    async checkLogin() {
        try {
            const result = await this.api.checkLogin();
            
            if (!result.loggedIn) {
                this.showLoginPage();
                return false;
            }
            
            return true;
            
        } catch (error) {
            this.showLoginPage();
            return false;
        }
    }

    showLoginPage() {
        const loginPage = document.getElementById('loginPage');
        const dashboard = document.getElementById('dashboard');
        
        if (loginPage) loginPage.style.display = 'block';
        if (dashboard) dashboard.style.display = 'none';
        
        // Attach login handler
        this.attachLoginHandler();
    }

    attachLoginHandler() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const passwordInput = document.getElementById('adminPassword');
            const errorDiv = document.getElementById('loginError');
            const password = passwordInput.value.trim();

            if (!password) {
                if (errorDiv) {
                    errorDiv.textContent = 'Please enter password';
                    errorDiv.style.display = 'block';
                }
                return;
            }

            const loading = Utils.showLoading(null, 'Logging in...');

            try {
                const result = await this.api.login(password);
                
                if (result.success) {
                    // Show dashboard
                    this.showDashboard();
                } else {
                    throw new Error('Invalid password');
                }
                
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.style.display = 'block';
                }
                // Shake animation for wrong password
                passwordInput.style.animation = 'shake 0.5s';
                setTimeout(() => {
                    passwordInput.style.animation = '';
                }, 500);
                
            } finally {
                Utils.hideLoading(loading);
            }
        });

        // Add shake animation if not present
        if (!document.querySelector('#shake-animation')) {
            const style = document.createElement('style');
            style.id = 'shake-animation';
            style.textContent = `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    showDashboard() {
        const loginPage = document.getElementById('loginPage');
        const dashboard = document.getElementById('dashboard');
        
        if (loginPage) loginPage.style.display = 'none';
        if (dashboard) dashboard.style.display = 'block';
        
        // Load initial data
        this.loadResponses();
        
        // Update last updated time
        this.updateLastUpdated();
    }

    initializeUI() {
        // Add copy URL functionality
        this.addCopyUrlButton();
        
        // Add refresh button handler
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadResponses(true));
        }
        
        // Add export button handler
        const exportBtn = document.querySelector('.export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        
        // Add logout handler
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Add search functionality
        this.addSearchFunctionality();
        
        // Add filter functionality
        this.addFilterFunctionality();
    }

    addCopyUrlButton() {
        const urlDisplay = document.getElementById('formUrl');
        if (!urlDisplay) return;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn copy-url-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy Form URL';
        
        copyBtn.addEventListener('click', async () => {
            try {
                await Utils.copyToClipboard(urlDisplay.textContent);
                Utils.showAlert('success', 'URL copied to clipboard!', 2000);
                
                // Show checkmark briefly
                const icon = copyBtn.querySelector('i');
                const originalClass = icon.className;
                icon.className = 'fas fa-check';
                
                setTimeout(() => {
                    icon.className = originalClass;
                }, 1000);
                
            } catch (error) {
                Utils.showAlert('error', 'Failed to copy URL');
            }
        });

        urlDisplay.parentNode.insertBefore(copyBtn, urlDisplay.nextSibling);
    }

    addSearchFunctionality() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="searchInput" placeholder="Search responses...">
                <button class="clear-search" style="display: none;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.appendChild(searchContainer);
        }

        // Add search functionality
        const searchInput = document.getElementById('searchInput');
        const clearBtn = searchContainer.querySelector('.clear-search');

        if (searchInput) {
            // Debounced search
            const debouncedSearch = Utils.debounce(() => {
                this.filterResponses(searchInput.value.trim());
            }, 300);

            searchInput.addEventListener('input', () => {
                clearBtn.style.display = searchInput.value ? 'block' : 'none';
                debouncedSearch();
            });

            // Clear search
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.style.display = 'none';
                this.filterResponses('');
            });
        }

        // Add search styles
        if (!document.querySelector('#search-styles')) {
            const style = document.createElement('style');
            style.id = 'search-styles';
            style.textContent = `
                .search-container {
                    flex: 1;
                    max-width: 300px;
                }
                .search-box {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .search-box i {
                    position: absolute;
                    left: 12px;
                    color: #7f8c8d;
                }
                .search-box input {
                    width: 100%;
                    padding: 10px 40px 10px 40px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    font-size: 14px;
                }
                .search-box input:focus {
                    outline: none;
                    border-color: #3498db;
                }
                .clear-search {
                    position: absolute;
                    right: 10px;
                    background: none;
                    border: none;
                    color: #7f8c8d;
                    cursor: pointer;
                    padding: 5px;
                }
                .clear-search:hover {
                    color: #e74c3c;
                }
            `;
            document.head.appendChild(style);
        }
    }

    addFilterFunctionality() {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-container';
        filterContainer.innerHTML = `
            <select id="dateFilter" class="filter-select">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
            </select>
        `;

        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.appendChild(filterContainer);
        }

        // Add filter functionality
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.filterByDate(dateFilter.value);
            });
        }

        // Add filter styles
        if (!document.querySelector('#filter-styles')) {
            const style = document.createElement('style');
            style.id = 'filter-styles';
            style.textContent = `
                .filter-container {
                    margin-left: 10px;
                }
                .filter-select {
                    padding: 10px 15px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    background: white;
                    font-size: 14px;
                    cursor: pointer;
                }
                .filter-select:focus {
                    outline: none;
                    border-color: #3498db;
                }
            `;
            document.head.appendChild(style);
        }
    }

    async loadResponses(showLoading = true) {
        let loading = null;
        if (showLoading) {
            loading = Utils.showLoading(null, 'Loading responses...');
        }

        try {
            const result = await this.api.getResponses();
            
            if (result.success) {
                this.responses = result.responses || [];
                this.displayResponses(this.responses);
                this.updateStats(this.responses);
                this.updateLastUpdated();
                
                // Check if new entries were added
                this.checkForNewEntries();
            } else {
                throw new Error('Failed to load responses');
            }
            
        } catch (error) {
            Utils.showAlert('error', `Failed to load responses: ${error.message}`);
            Utils.error('Load responses error:', error);
            
            // Show empty state
            this.showEmptyState('Failed to load responses. Please try again.');
            
        } finally {
            if (loading) {
                Utils.hideLoading(loading);
            }
        }
    }

    displayResponses(responses) {
        const tableBody = document.getElementById('responseBody');
        const noDataDiv = document.getElementById('noData');
        
        if (!tableBody) return;
        
        if (!responses || responses.length === 0) {
            tableBody.innerHTML = '';
            if (noDataDiv) {
                noDataDiv.style.display = 'block';
            }
            return;
        }
        
        if (noDataDiv) {
            noDataDiv.style.display = 'none';
        }
        
        // Create table rows
        let html = '';
        responses.forEach((response, index) => {
            const isNew = this.isNewEntry(response.timestamp);
            
            html += `
                <tr class="${isNew ? 'new-entry' : ''}" data-id="${response.id}">
                    <td>${index + 1}</td>
                    <td class="timestamp-cell">
                        ${Utils.formatDate(response.timestamp)}
                        <br>
                        <small>${Utils.getTimeAgo(response.timestamp)}</small>
                    </td>
                    <td>
                        <strong>${response.name}</strong>
                    </td>
                    <td>${response.dob}</td>
                    <td>${Utils.formatMobile(response.mobile)}</td>
                    <td>${response.father}</td>
                    <td class="aadhar-cell">
                        ${Utils.formatAadhar(response.aadhar)}
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // Add row click handlers
        this.addRowClickHandlers();
    }

    addRowClickHandlers() {
        const rows = document.querySelectorAll('#responseBody tr');
        rows.forEach(row => {
            row.addEventListener('click', () => {
                // Toggle details view
                this.toggleRowDetails(row);
            });
        });
    }

    toggleRowDetails(row) {
        const detailsRow = row.nextElementSibling;
        
        if (detailsRow && detailsRow.classList.contains('details-row')) {
            detailsRow.remove();
            row.classList.remove('expanded');
        } else {
            // Remove any existing details row
            const existingDetails = row.parentNode.querySelector('.details-row');
            if (existingDetails) {
                existingDetails.remove();
                existingDetails.previousElementSibling.classList.remove('expanded');
            }
            
            // Add new details row
            const responseId = row.dataset.id;
            const response = this.responses.find(r => r.id === responseId);
            
            if (response) {
                const detailsHtml = `
                    <tr class="details-row">
                        <td colspan="7">
                            <div class="response-details">
                                <h4>Response Details</h4>
                                <div class="details-grid">
                                    <div class="detail-item">
                                        <span>IP Address:</span> ${response.ip || 'N/A'}
                                    </div>
                                    <div class="detail-item">
                                        <span>Response ID:</span> ${response.id}
                                    </div>
                                    <div class="detail-item">
                                        <span>Submitted:</span> ${Utils.formatDate(response.timestamp)}
                                    </div>
                                </div>
                                <div class="detail-actions">
                                    <button class="btn btn-secondary copy-details">
                                        <i class="fas fa-copy"></i> Copy Details
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
                
                row.insertAdjacentHTML('afterend', detailsHtml);
                row.classList.add('expanded');
                
                // Add copy details handler
                const copyBtn = row.nextElementSibling.querySelector('.copy-details');
                if (copyBtn) {
                    copyBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await this.copyResponseDetails(response);
                    });
                }
            }
        }
        
        // Add details row styles if not present
        if (!document.querySelector('#details-styles')) {
            const style = document.createElement('style');
            style.id = 'details-styles';
            style.textContent = `
                .details-row {
                    background: #f8f9fa;
                    animation: fadeIn 0.3s ease;
                }
                .response-details {
                    padding: 20px;
                }
                .response-details h4 {
                    margin-bottom: 15px;
                    color: #2c3e50;
                }
                .details-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 15px;
                }
                .detail-item span {
                    font-weight: 600;
                    color: #555;
                    display: inline-block;
                    min-width: 120px;
                }
                .detail-actions {
                    display: flex;
                    gap: 10px;
                }
                tr.expanded {
                    background: #f0f7ff;
                }
            `;
            document.head.appendChild(style);
        }
    }

    async copyResponseDetails(response) {
        const details = `
Name: ${response.name}
Date of Birth: ${response.dob}
Mobile: ${Utils.formatMobile(response.mobile)}
Father's Name: ${response.father}
Aadhar: ${Utils.formatAadhar(response.aadhar)}
Submitted: ${Utils.formatDate(response.timestamp)}
IP Address: ${response.ip || 'N/A'}
Response ID: ${response.id}
        `.trim();
        
        try {
            await Utils.copyToClipboard(details);
            Utils.showAlert('success', 'Response details copied!', 2000);
        } catch (error) {
            Utils.showAlert('error', 'Failed to copy details');
        }
    }

    updateStats(responses) {
        // Total responses
        const totalElement = document.getElementById('totalResponses');
        if (totalElement) {
            totalElement.textContent = responses.length;
        }
        
        // Today's responses
        const todayElement = document.getElementById('todayResponses');
        if (todayElement) {
            const today = new Date().toDateString();
            const todayCount = responses.filter(r => 
                new Date(r.timestamp).toDateString() === today
            ).length;
            todayElement.textContent = todayCount;
        }
        
        // Last 24 hours
        const last24Element = document.getElementById('last24Hours');
        if (last24Element) {
            const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
            const last24Count = responses.filter(r => 
                new Date(r.timestamp).getTime() > last24Hours
            ).length;
            last24Element.textContent = last24Count;
        }
        
        // Update trends
        this.updateTrends();
    }

    updateTrends() {
        // You can add trend calculation here
        // Example: compare with previous hour/day
    }

    updateLastUpdated() {
        this.lastUpdateTime = new Date();
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = this.lastUpdateTime.toLocaleTimeString('hi-IN');
        }
    }

    updateFormUrl() {
        const formUrlElement = document.getElementById('formUrl');
        if (formUrlElement) {
            formUrlElement.textContent = window.location.origin;
        }
    }

    startAutoRefresh() {
        // Clear existing interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        // Set new interval
        this.autoRefreshInterval = setInterval(() => {
            this.loadResponses(false);
        }, CONFIG.AUTO_REFRESH_INTERVAL);
        
        Utils.log(`Auto-refresh started (${CONFIG.AUTO_REFRESH_INTERVAL}ms)`);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            Utils.log('Auto-refresh stopped');
        }
    }

    checkForNewEntries() {
        // Check if new entries were added since last check
        // You can implement logic to show notifications or play sounds
        const newEntries = this.responses.filter(r => this.isNewEntry(r.timestamp));
        
        if (newEntries.length > 0) {
            // Visual feedback
            if (document.hidden) {
                // Tab is in background - show notification
                this.showDesktopNotification(newEntries.length);
            } else {
                // Tab is active - show subtle feedback
                this.flashTitle(newEntries.length);
            }
            
            // Play sound (optional)
            this.playNotificationSound();
        }
    }

    isNewEntry(timestamp) {
        if (!this.lastUpdateTime) return false;
        return new Date(timestamp) > this.lastUpdateTime;
    }

    showDesktopNotification(count) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }
        
        new Notification('New Form Submission', {
            body: `${count} new response${count > 1 ? 's' : ''} received`,
            icon: '/favicon.ico'
        });
    }

    flashTitle(count) {
        const originalTitle = document.title;
        let flashCount = 0;
        const maxFlashes = 6;
        
        const flashInterval = setInterval(() => {
            if (flashCount >= maxFlashes) {
                clearInterval(flashInterval);
                document.title = originalTitle;
                return;
            }
            
            document.title = flashCount % 2 === 0 
                ? `(${count} new) Student Form Admin` 
                : originalTitle;
            
            flashCount++;
        }, 500);
    }

    playNotificationSound() {
        // Create a simple notification sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // Audio context not supported or blocked
            Utils.log('Audio notification not available');
        }
    }

    filterResponses(searchTerm) {
        if (!searchTerm) {
            this.displayResponses(this.responses);
            return;
        }
        
        const filtered = this.responses.filter(response => {
            const searchLower = searchTerm.toLowerCase();
            return (
                response.name.toLowerCase().includes(searchLower) ||
                response.father.toLowerCase().includes(searchLower) ||
                response.mobile.includes(searchTerm) ||
                response.aadhar.includes(searchTerm) ||
                response.dob.includes(searchTerm)
            );
        });
        
        this.displayResponses(filtered);
    }

    filterByDate(filter) {
        const now = new Date();
        let filtered = this.responses;
        
        switch (filter) {
            case 'today':
                const today = now.toDateString();
                filtered = this.responses.filter(r => 
                    new Date(r.timestamp).toDateString() === today
                );
                break;
                
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filtered = this.responses.filter(r => 
                    new Date(r.timestamp) > weekAgo
                );
                break;
                
            case 'month':
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                filtered = this.responses.filter(r => 
                    new Date(r.timestamp) > monthAgo
                );
                break;
                
            case 'all':
            default:
                filtered = this.responses;
                break;
        }
        
        this.displayResponses(filtered);
    }

    showEmptyState(message = 'No responses found') {
        const tableBody = document.getElementById('responseBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>${message}</h3>
                        <p>When students submit the form, responses will appear here automatically.</p>
                    </div>
                </td>
            </tr>
        `;
    }

    async exportData() {
        const loading = Utils.showLoading(null, 'Preparing export...');
        
        try {
            // Create CSV content
            const headers = ['Timestamp', 'Name', 'Date of Birth', 'Mobile No', 'Father Name', 'Aadhar No', 'IP Address'];
            const rows = this.responses.map(response => [
                Utils.formatDate(response.timestamp),
                `"${response.name}"`,
                response.dob,
                `"${Utils.formatMobile(response.mobile)}"`,
                `"${response.father}"`,
                `"${Utils.formatAadhar(response.aadhar)}"`,
                response.ip || 'N/A'
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');
            
            // Create and download file
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.setAttribute('download', `student_responses_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            Utils.showAlert('success', 'Data exported successfully!');
            
        } catch (error) {
            Utils.showAlert('error', `Export failed: ${error.message}`);
            Utils.error('Export error:', error);
            
        } finally {
            Utils.hideLoading(loading);
        }
    }

    logout() {
        // Clear session
        document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        localStorage.removeItem('adminLoggedIn');
        
        // Stop auto-refresh
        this.stopAutoRefresh();
        
        // Redirect to login
        window.location.reload();
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    Utils.log('DOM Content Loaded');
    
    // Initialize based on current page
    if (document.getElementById('studentForm')) {
        // Student form page
        new FormHandler();
        Utils.log('Form handler initialized');
        
    } else if (document.getElementById('dashboard')) {
        // Admin dashboard page
        window.adminDashboard = new AdminDashboard();
        Utils.log('Admin dashboard initialized');
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    // Add global error handler
    window.addEventListener('error', (event) => {
        Utils.error('Global error:', event.error);
    });
    
    // Add offline/online detection
    window.addEventListener('online', () => {
        Utils.showAlert('success', 'Back online!', 3000);
    });
    
    window.addEventListener('offline', () => {
        Utils.showAlert('warning', 'You are offline. Some features may not work.', 5000);
    });
    
    // Service Worker registration (optional)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                Utils.log('ServiceWorker registered:', registration);
            })
            .catch(error => {
                Utils.error('ServiceWorker registration failed:', error);
            });
    }
});

// ==================== GLOBAL EXPORTS ====================
if (typeof window !== 'undefined') {
    window.StudentForm = {
        Utils,
        ApiService,
        FormHandler,
        AdminDashboard,
        CONFIG
    };
}
