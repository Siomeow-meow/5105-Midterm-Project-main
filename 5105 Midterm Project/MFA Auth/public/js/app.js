// public/js/app.js
// Main application logic
class App {
    constructor() {
        this.currentUser = null;
        this.otpTimerInterval = null;
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
            console.log('Setting up event listeners...');
            
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

            // OTP Resend functionality
            const resendOtpBtn = document.getElementById('resend-otp-btn');
            if (resendOtpBtn) {
                resendOtpBtn.addEventListener('click', () => {
                    console.log('Resend OTP clicked');
                    // Clear the input field to encourage entering new code
                    const verifyCodeInput = document.getElementById('verify-code');
                    if (verifyCodeInput) {
                        verifyCodeInput.value = '';
                        verifyCodeInput.focus();
                    }
                });
            }

            // Modal functionality
            this.setupModals();

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

            console.log('Event listeners setup complete');
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

    setupModals() {
        console.log('Setting up modals...');
        
        // Change Password Modal
        const changePasswordBtn = document.getElementById('change-password-btn');
        const changePasswordModal = document.getElementById('change-password-modal');
        const closeChangePasswordModal = document.getElementById('close-change-password-modal');
        const cancelChangePassword = document.getElementById('cancel-change-password');

        if (changePasswordBtn) {
            console.log('Change password button found');
            changePasswordBtn.addEventListener('click', () => {
                console.log('Change password button clicked');
                this.showModal('change-password-modal');
            });
        } else {
            console.error('Change password button not found');
        }

        if (closeChangePasswordModal) {
            closeChangePasswordModal.addEventListener('click', () => this.hideModal('change-password-modal'));
        }

        if (cancelChangePassword) {
            cancelChangePassword.addEventListener('click', () => this.hideModal('change-password-modal'));
        }

        // Reset MFA Modal
        const resetMfaBtn = document.getElementById('reset-mfa-btn');
        const resetMfaModal = document.getElementById('reset-mfa-modal');
        const closeResetMfaModal = document.getElementById('close-reset-mfa-modal');
        const cancelResetMfa = document.getElementById('cancel-reset-mfa');
        const confirmResetMfa = document.getElementById('confirm-reset-mfa');

        if (resetMfaBtn) {
            console.log('Reset MFA button found');
            resetMfaBtn.addEventListener('click', () => {
                console.log('Reset MFA button clicked');
                this.showModal('reset-mfa-modal');
            });
        } else {
            console.error('Reset MFA button not found');
        }

        if (closeResetMfaModal) {
            closeResetMfaModal.addEventListener('click', () => this.hideModal('reset-mfa-modal'));
        }

        if (cancelResetMfa) {
            cancelResetMfa.addEventListener('click', () => this.hideModal('reset-mfa-modal'));
        }

        if (confirmResetMfa) {
            confirmResetMfa.addEventListener('click', () => this.handleResetMfa());
        }

        // Change Password Form
        const changePasswordForm = document.getElementById('change-password-form');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => this.handleChangePassword(e));
        }

        // New password strength indicator
        const newPasswordInput = document.getElementById('new-password');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', (e) => this.updateNewPasswordStrength(e.target.value));
        }

        // Modal password toggles
        this.setupModalPasswordToggles();
        
        console.log('Modals setup complete');
    }

    setupModalPasswordToggles() {
        const modalPasswordToggles = [
            { toggleId: 'toggle-current-password', inputId: 'current-password' },
            { toggleId: 'toggle-new-password', inputId: 'new-password' },
            { toggleId: 'toggle-confirm-new-password', inputId: 'confirm-new-password' }
        ];

        modalPasswordToggles.forEach(({ toggleId, inputId }) => {
            const toggleButton = document.getElementById(toggleId);
            const passwordInput = document.getElementById(inputId);
            
            if (toggleButton && passwordInput) {
                toggleButton.addEventListener('click', () => {
                    const isPassword = passwordInput.type === 'password';
                    passwordInput.type = isPassword ? 'text' : 'password';
                    
                    const icon = toggleButton.querySelector('i');
                    if (icon) {
                        icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
                    }
                    
                    toggleButton.style.color = isPassword ? 'var(--primary)' : 'var(--gray)';
                });
            }
        });
    }

    showModal(modalId) {
        console.log(`Showing modal: ${modalId}`);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            console.log(`Modal ${modalId} shown`);
        } else {
            console.error(`Modal with id ${modalId} not found`);
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            this.clearModalAlerts();
        }
    }

    clearModalAlerts() {
        const alerts = document.querySelectorAll('#change-password-alert, #reset-mfa-alert');
        alerts.forEach(alert => {
            alert.classList.add('hidden');
            alert.textContent = '';
        });
    }

    // OTP Timer functionality
    startOtpTimer() {
        console.log('Starting OTP timer...');
        const timerElement = document.getElementById('otp-timer');
        const setupTimerElement = document.getElementById('timer-display-setup');
        
        if (!timerElement && !setupTimerElement) {
            console.log('No OTP timer elements found');
            return;
        }

        this.updateOtpTimer();
        this.otpTimerInterval = setInterval(() => {
            this.updateOtpTimer();
        }, 1000);
        
        console.log('OTP timer started');
    }

    stopOtpTimer() {
        if (this.otpTimerInterval) {
            clearInterval(this.otpTimerInterval);
            this.otpTimerInterval = null;
            console.log('OTP timer stopped');
        }
    }

    async updateOtpTimer() {
        try {
            const result = await MFAService.getRemainingTime();
            const remainingTime = result.remainingTime;
            
            console.log(`OTP remaining time: ${remainingTime}s`);
            
            // Update verification timer
            const timerDisplay = document.getElementById('timer-display');
            const resendBtn = document.getElementById('resend-otp-btn');

            if (timerDisplay) {
                timerDisplay.textContent = `${remainingTime}s`;
                
                // Update color based on remaining time
                timerDisplay.className = 'timer-display';
                if (remainingTime <= 10) {
                    timerDisplay.classList.add('timer-critical');
                } else if (remainingTime <= 15) {
                    timerDisplay.classList.add('timer-warning');
                }
            }

            if (resendBtn) {
                resendBtn.disabled = remainingTime > 5; // Enable when 5 seconds or less
                if (remainingTime <= 5) {
                    resendBtn.textContent = 'Get new code';
                    resendBtn.style.color = 'var(--primary)';
                } else {
                    resendBtn.textContent = `Wait ${remainingTime}s`;
                    resendBtn.style.color = 'var(--gray)';
                }
            }

            // Update setup timer
            const setupTimerDisplay = document.getElementById('timer-display-setup');
            if (setupTimerDisplay) {
                setupTimerDisplay.textContent = `${remainingTime}s`;
                
                // Update color based on remaining time
                setupTimerDisplay.className = 'timer-display';
                if (remainingTime <= 10) {
                    setupTimerDisplay.classList.add('timer-critical');
                } else if (remainingTime <= 15) {
                    setupTimerDisplay.classList.add('timer-warning');
                }
            }

            if (remainingTime === 0) {
                // Timer reached 0, reset
                setTimeout(() => {
                    this.updateOtpTimer();
                }, 100);
            }
        } catch (error) {
            console.error('Error updating OTP timer:', error);
        }
    }

    showSection(sectionId) {
        try {
            console.log(`Showing section: ${sectionId}`);
            
            // Stop OTP timer when leaving MFA sections
            if (sectionId !== 'mfa-setup-section' && sectionId !== 'mfa-verify-section') {
                this.stopOtpTimer();
            }

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
                } else if (sectionId === 'mfa-setup-section' || sectionId === 'mfa-verify-section') {
                    // Start OTP timer for MFA sections
                    setTimeout(() => {
                        this.startOtpTimer();
                    }, 100);
                }
                
                console.log(`Section ${sectionId} shown successfully`);
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

    updateNewPasswordStrength(password) {
        const strengthFill = document.getElementById('new-password-strength-fill');
        const strengthText = document.getElementById('new-password-strength-text');
        
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
            try {
                const result = await MFAService.generateSecret();
                if (result.secret) {
                    MFAService.displayManualSetup(result.secret);
                    this.showSection('mfa-setup-section');
                }
            } catch (fallbackError) {
                console.error('Fallback MFA setup also failed:', fallbackError);
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
            
            // Update current user's MFA status
            if (this.currentUser) {
                this.currentUser.mfaEnabled = true;
            }
            
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

    async handleChangePassword(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;

        try {
            // Validation
            if (newPassword !== confirmNewPassword) {
                throw new Error('New passwords do not match');
            }

            if (newPassword.length < 6) {
                throw new Error('New password must be at least 6 characters');
            }

            if (currentPassword === newPassword) {
                throw new Error('New password must be different from current password');
            }

            await AuthService.changePassword(currentPassword, newPassword);
            
            this.showAlert('change-password-alert', 'Password changed successfully!', 'success');
            
            // Clear form and close modal after delay
            setTimeout(() => {
                document.getElementById('change-password-form').reset();
                this.hideModal('change-password-modal');
            }, 2000);

        } catch (error) {
            this.showAlert('change-password-alert', error.message);
        }
    }

    async handleResetMfa() {
        try {
            console.log('Resetting MFA...');
            await MFAService.resetMFA();
            
            this.showAlert('reset-mfa-alert', 'MFA reset successfully!', 'success');
            
            // Update dashboard status
            if (this.currentUser) {
                this.currentUser.mfaEnabled = false;
                // Force refresh the dashboard to show updated status
                this.showDashboard(this.currentUser);
            }
            
            // Close modal after delay
            setTimeout(() => {
                this.hideModal('reset-mfa-modal');
            }, 2000);

        } catch (error) {
            console.error('MFA reset error:', error);
            this.showAlert('reset-mfa-alert', error.message);
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

            console.log('Showing dashboard for user:', user);
            
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
                    console.log('MFA status set to active (green)');
                } else {
                    mfaStatusElement.textContent = 'MFA Inactive';
                    mfaStatusElement.className = 'status-badge inactive';
                    console.log('MFA status set to inactive (red)');
                }
            } else {
                console.error('MFA status element not found');
            }
            
            this.showSection('dashboard-section');
            console.log('Dashboard shown successfully');
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
    console.log('DOM loaded, initializing app...');
    new App();
});

// Fallback initialization
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        console.log('Fallback initialization...');
        new App();
    }, 1);
}