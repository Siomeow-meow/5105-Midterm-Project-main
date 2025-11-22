// public/js/app.js
// Main application logic
class App {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // Wait for DOM to be fully loaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.initializeApp();
                });
            } else {
                this.initializeApp();
            }
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    async initializeApp() {
        // Check if user is already authenticated
        try {
            const authStatus = await AuthService.checkAuthStatus();
            if (authStatus.authenticated && authStatus.user) {
                this.showDashboard(authStatus.user);
                return;
            }
        } catch (error) {
            console.error('Auth status check failed:', error);
        }

        this.setupEventListeners();
        this.showSection('welcome-section');
    }

    setupEventListeners() {
        try {
            // Welcome section buttons
            const getStartedBtn = document.getElementById('get-started');
            const alreadyHaveAccountBtn = document.getElementById('already-have-account');
            
            if (getStartedBtn) {
                getStartedBtn.addEventListener('click', () => this.showSection('register-section'));
            }
            
            if (alreadyHaveAccountBtn) {
                alreadyHaveAccountBtn.addEventListener('click', () => this.showSection('login-section'));
            }

            // Back buttons
            const backToWelcomeFromRegister = document.getElementById('back-to-welcome-from-register');
            const backToWelcomeFromLogin = document.getElementById('back-to-welcome-from-login');
            
            if (backToWelcomeFromRegister) {
                backToWelcomeFromRegister.addEventListener('click', () => this.showSection('welcome-section'));
            }
            
            if (backToWelcomeFromLogin) {
                backToWelcomeFromLogin.addEventListener('click', () => this.showSection('welcome-section'));
            }

            // Navigation between auth forms
            const showLoginFromRegister = document.getElementById('show-login-from-register');
            const showRegisterFromLogin = document.getElementById('show-register-from-login');
            
            if (showLoginFromRegister) {
                showLoginFromRegister.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showSection('login-section');
                });
            }
            
            if (showRegisterFromLogin) {
                showRegisterFromLogin.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showSection('register-section');
                });
            }

            // Form submissions - check if forms exist before adding listeners
            const registerForm = document.getElementById('register-form');
            const loginForm = document.getElementById('login-form');
            const mfaSetupForm = document.getElementById('mfa-setup-form');
            const mfaVerifyForm = document.getElementById('mfa-verify-form');

            if (registerForm) {
                registerForm.addEventListener('submit', (e) => this.handleRegister(e));
            }
            
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            }
            
            if (mfaSetupForm) {
                mfaSetupForm.addEventListener('submit', (e) => this.handleMfaSetup(e));
            }
            
            if (mfaVerifyForm) {
                mfaVerifyForm.addEventListener('submit', (e) => this.handleMfaVerify(e));
            }

            // Password strength indicator
            const passwordInput = document.getElementById('reg-password');
            if (passwordInput) {
                passwordInput.addEventListener('input', (e) => this.updatePasswordStrength(e.target.value));
            }

            // Password toggle functionality
            this.setupPasswordToggles();

            // MFA actions
            const skipMfaLink = document.getElementById('skip-mfa');
            const backToLoginLink = document.getElementById('back-to-login');
            const logoutBtn = document.getElementById('logout-btn');

            if (skipMfaLink) {
                skipMfaLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.skipMfa();
                });
            }
            
            if (backToLoginLink) {
                backToLoginLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showSection('login-section');
                });
            }
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.handleLogout());
            }

        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    setupPasswordToggles() {
        const passwordToggles = [
            {
                toggleId: 'toggle-reg-password',
                inputId: 'reg-password'
            },
            {
                toggleId: 'toggle-reg-confirm-password', 
                inputId: 'reg-confirm-password'
            },
            {
                toggleId: 'toggle-login-password',
                inputId: 'login-password'
            }
        ];

        passwordToggles.forEach(({ toggleId, inputId }) => {
            const toggleButton = document.getElementById(toggleId);
            const passwordInput = document.getElementById(inputId);
            
            if (!toggleButton || !passwordInput) {
                console.warn(`Password toggle elements not found: ${toggleId}, ${inputId}`);
                return;
            }

            // Set initial state
            toggleButton.setAttribute('type', 'button');
            toggleButton.setAttribute('aria-label', 'Show password');
            toggleButton.setAttribute('tabindex', '0');
            
            const togglePasswordVisibility = () => {
                const isCurrentlyPassword = passwordInput.type === 'password';
                
                // Toggle input type
                passwordInput.type = isCurrentlyPassword ? 'text' : 'password';
                
                // Update icon and aria-label
                const icon = toggleButton.querySelector('i');
                if (icon) {
                    icon.className = isCurrentlyPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
                }
                
                toggleButton.setAttribute('aria-label', 
                    isCurrentlyPassword ? 'Hide password' : 'Show password');
                
                // Visual feedback
                toggleButton.style.color = isCurrentlyPassword ? 'var(--primary)' : 'var(--gray)';
                
                // Focus the input after toggle for better UX
                passwordInput.focus();
            };

            // Click event
            toggleButton.addEventListener('click', togglePasswordVisibility);
            
            // Enter key support for accessibility
            toggleButton.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    togglePasswordVisibility();
                }
            });
            
            // Add focus styles for accessibility
            toggleButton.addEventListener('focus', () => {
                toggleButton.style.outline = '2px solid var(--primary)';
                toggleButton.style.outlineOffset = '2px';
            });
            
            toggleButton.addEventListener('blur', () => {
                toggleButton.style.outline = 'none';
            });
        });
    }

    showSection(sectionId) {
        try {
            // Hide all sections
            const sections = [
                'welcome-section',
                'register-section', 
                'login-section',
                'mfa-setup-section',
                'mfa-verify-section',
                'dashboard-section'
            ];
            
            sections.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.classList.add('hidden');
                }
            });
            
            // Clear alerts
            this.clearAlerts();
            
            // Show the requested section
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                
                // Special handling for specific sections
                if (sectionId === 'register-section') {
                    this.setupPasswordStrength();
                }
            } else {
                console.warn(`Section with id '${sectionId}' not found`);
                // Fallback to welcome section
                const welcomeSection = document.getElementById('welcome-section');
                if (welcomeSection) {
                    welcomeSection.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Error showing section:', error);
        }
    }

    clearAlerts() {
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(alert => {
            alert.classList.add('hidden');
            alert.textContent = '';
        });
    }

    showAlert(alertId, message, type = 'danger') {
        try {
            const alert = document.getElementById(alertId);
            if (alert) {
                alert.textContent = message;
                alert.className = `alert alert-${type}`;
                alert.classList.remove('hidden');
                
                // Auto-hide success messages after 3 seconds
                if (type === 'success') {
                    setTimeout(() => {
                        alert.classList.add('hidden');
                    }, 3000);
                }
            }
        } catch (error) {
            console.error('Error showing alert:', error);
        }
    }

    setLoading(formId, isLoading) {
        try {
            const form = document.getElementById(formId);
            if (!form) return;

            const button = form.querySelector('button[type="submit"]');
            if (!button) return;

            if (isLoading) {
                button.disabled = true;
                button.setAttribute('data-original-text', button.innerHTML);
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                form.classList.add('loading');
            } else {
                button.disabled = false;
                const originalText = button.getAttribute('data-original-text') || '<span>Submit</span>';
                button.innerHTML = originalText;
                form.classList.remove('loading');
            }
        } catch (error) {
            console.error('Error setting loading state:', error);
        }
    }

    setupPasswordStrength() {
        const passwordInput = document.getElementById('reg-password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }
    }

    updatePasswordStrength(password) {
        const strengthFill = document.getElementById('password-strength-fill');
        const strengthText = document.getElementById('password-strength-text');
        
        if (!strengthFill || !strengthText) return;

        let strength = 0;
        let color = '#ef4444'; // red
        let text = 'Weak';

        if (password.length >= 8) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 25;
        if (/[^A-Za-z0-9]/.test(password)) strength += 25;

        if (strength >= 75) {
            color = '#10b981'; // green
            text = 'Strong';
        } else if (strength >= 50) {
            color = '#f59e0b'; // yellow
            text = 'Medium';
        }

        strengthFill.style.width = `${strength}%`;
        strengthFill.style.background = color;
        strengthText.textContent = text;
        strengthText.style.color = color;
    }

    async handleRegister(e) {
        e.preventDefault();
        this.setLoading('register-form', true);

        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;

        try {
            // Client-side validation
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            if (username.length < 3) {
                throw new Error('Username must be at least 3 characters');
            }

            const result = await AuthService.register(username, password);
            this.showAlert('register-alert', 'Account created successfully! Please sign in.', 'success');
            
            // Clear form and show login after delay
            setTimeout(() => {
                document.getElementById('register-form').reset();
                this.showSection('login-section');
            }, 2000);
            
        } catch (error) {
            this.showAlert('register-alert', error.message);
        } finally {
            this.setLoading('register-form', false);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        this.setLoading('login-form', true);

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const result = await AuthService.login(username, password);
            this.currentUser = result.user;
            
            if (result.requiresMFA) {
                this.showSection('mfa-verify-section');
            } else {
                await this.setupMfa();
            }
            
        } catch (error) {
            this.showAlert('login-alert', error.message);
        } finally {
            this.setLoading('login-form', false);
        }
    }

    async setupMfa() {
        try {
            this.showLoading(true);
            const result = await MFAService.generateSecret();
            
            // Try multiple methods to display QR code
            if (result.qrCode) {
                console.log('Displaying QR code from server');
                MFAService.displayQRCode(result.qrCode);
            } else if (result.secret) {
                console.log('Using QRCode.js library');
                const username = document.getElementById('login-username').value || this.currentUser?.username || 'user';
                MFAService.displayQRCodeWithLibrary(result.secret, username);
            } else {
                throw new Error('No QR code data received from server');
            }
            
            // Show manual setup as fallback
            if (result.secret) {
                MFAService.showManualSetup(result.secret);
            }
            
            this.showSection('mfa-setup-section');
        } catch (error) {
            console.error('MFA setup error:', error);
            this.showAlert('mfa-setup-alert', 'Failed to generate QR code: ' + error.message);
            
            // Fallback: show manual setup
            const result = await MFAService.generateSecret();
            if (result.secret) {
                MFAService.displayManualSetup(result.secret);
                this.showSection('mfa-setup-section');
            }
        } finally {
            this.showLoading(false);
        }
    }

    async handleMfaSetup(e) {
        e.preventDefault();
        this.setLoading('mfa-setup-form', true);

        const code = document.getElementById('mfa-code').value;

        try {
            // Validate code format
            if (!/^\d{6}$/.test(code)) {
                throw new Error('Please enter a valid 6-digit code');
            }

            await MFAService.verifySetup(code);
            this.showAlert('mfa-setup-alert', 'MFA setup successful!', 'success');
            
            setTimeout(() => {
                this.showDashboard(this.currentUser);
            }, 1000);
            
        } catch (error) {
            this.showAlert('mfa-setup-alert', error.message);
        } finally {
            this.setLoading('mfa-setup-form', false);
        }
    }

    async handleMfaVerify(e) {
        e.preventDefault();
        this.setLoading('mfa-verify-form', true);

        const code = document.getElementById('verify-code').value;

        try {
            // Validate code format
            if (!/^\d{6}$/.test(code)) {
                throw new Error('Please enter a valid 6-digit code');
            }

            const result = await MFAService.verifyLogin(code);
            this.showDashboard(result.user);
        } catch (error) {
            this.showAlert('mfa-verify-alert', error.message);
        } finally {
            this.setLoading('mfa-verify-form', false);
        }
    }

    skipMfa() {
        if (this.currentUser) {
            this.showDashboard(this.currentUser);
        } else {
            this.showSection('login-section');
        }
    }

    showDashboard(user) {
        try {
            if (!user) {
                console.error('No user data provided for dashboard');
                this.showSection('login-section');
                return;
            }

            document.getElementById('welcome-user').textContent = `Welcome back, ${user.username}!`;
            document.getElementById('dashboard-username').textContent = user.username;
            
            // Update last login time
            const lastLoginElement = document.getElementById('last-login');
            if (lastLoginElement) {
                lastLoginElement.textContent = new Date().toLocaleString();
            }
            
            const mfaStatusElement = document.getElementById('mfa-status');
            if (mfaStatusElement) {
                if (user.mfaEnabled) {
                    mfaStatusElement.textContent = 'MFA Active';
                    mfaStatusElement.className = 'status-badge active';
                } else {
                    mfaStatusElement.textContent = 'MFA Inactive';
                    mfaStatusElement.className = 'status-badge';
                    mfaStatusElement.style.background = '#ef4444';
                }
            }
            
            this.showSection('dashboard-section');
        } catch (error) {
            console.error('Error showing dashboard:', error);
            this.showSection('login-section');
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            if (show) {
                spinner.classList.remove('hidden');
            } else {
                spinner.classList.add('hidden');
            }
        }
    }

    async handleLogout() {
        try {
            this.showLoading(true);
            await AuthService.logout();
            this.currentUser = null;
            
            // Clear forms
            const forms = [
                'register-form',
                'login-form', 
                'mfa-setup-form',
                'mfa-verify-form'
            ];
            
            forms.forEach(formId => {
                const form = document.getElementById(formId);
                if (form) form.reset();
            });
            
            this.showSection('welcome-section');
        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            this.showLoading(false);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

// Fallback initialization
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        new App();
    }, 1);
}