// Main application controller
// Handles navigation, authentication, and overall app state management

class HRLeaveApp {
    constructor() {
        this.currentView = 'dashboard';
        this.currentUser = null;
        this.userRole = null;
        this.isAuthenticated = false;
        this.notifications = [];
        
        this.init();
    }

    async init() {
        // Show loading screen
        this.showLoading();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check for existing authentication
        await this.checkAuthState();
        
        // Initialize components if authenticated
        if (this.isAuthenticated) {
            await this.initializeApp();
        } else {
            this.showLoginScreen();
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Authentication - Role Selection
        document.getElementById('hr-login-btn')?.addEventListener('click', () => {
            this.showModal('hr-login-modal');
        });

        document.getElementById('employee-login-btn')?.addEventListener('click', () => {
            this.showModal('employee-login-modal');
        });

        // Modal Controls
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal;
                this.hideModal(modalId);
            });
        });

        // Tab Controls
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                const parentModal = e.target.closest('.auth-modal');
                this.switchTab(parentModal, tabId);
            });
        });

        // HR Authentication Forms
        document.getElementById('hr-signin-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleHRSignIn(e);
        });

        document.getElementById('hr-signup-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleHRSignUp(e);
        });

        // Employee Authentication Forms
        document.getElementById('employee-signin-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmployeeSignIn(e);
        });

        document.getElementById('employee-signup-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmployeeSignUp(e);
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.logout();
        });

        // User menu
        document.getElementById('user-menu-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleUserMenu();
        });

        // Notifications
        document.getElementById('notifications-btn')?.addEventListener('click', () => {
            this.toggleNotifications();
        });

        document.getElementById('mark-all-read')?.addEventListener('click', () => {
            this.markAllNotificationsAsRead();
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            this.closeDropdowns(e);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // User management
        document.getElementById('refresh-users')?.addEventListener('click', () => {
            this.loadUsersData();
        });

        document.getElementById('create-employee-btn')?.addEventListener('click', () => {
            this.showModal('create-employee-modal');
        });

        document.getElementById('create-employee-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateEmployee(e);
        });

        document.getElementById('reject-user-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRejectUser(e);
        });
    }

    async checkAuthState() {
        try {
            // Check Firebase auth state
            const user = window.FirebaseConfig.getCurrentUser();
            if (user) {
                this.currentUser = user;
                this.userRole = await window.FirebaseConfig.getCurrentUserRole();
                this.isAuthenticated = true;
            }
        } catch (error) {
            console.error('Error checking auth state:', error);
            this.isAuthenticated = false;
        }
    }

    async getUserRole(uid) {
        try {
            const userData = await window.FirebaseConfig.firestoreService.getUser(uid);
            return userData?.role || 'employee';
        } catch (error) {
            console.error('Error getting user role:', error);
            return 'employee';
        }
    }

    // New production authentication handlers
    async handleHRSignIn(event) {
        const form = event.target;
        const formData = new FormData(form);
        const email = formData.get('email') || document.getElementById('hr-email').value;
        const password = formData.get('password') || document.getElementById('hr-password').value;

        try {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';

            const user = await window.FirebaseConfig.signInAsHR(email, password);
            this.currentUser = user;
            this.userRole = 'hr';
            this.isAuthenticated = true;

            this.hideModal('hr-login-modal');
            await this.initializeApp();
        } catch (error) {
            console.error('HR sign-in error:', error);
            this.showErrorMessage(error.message || 'Failed to sign in as HR. Please check your credentials.');
        } finally {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In as HR';
        }
    }

    async handleHRSignUp(event) {
        const form = event.target;
        const name = document.getElementById('hr-signup-name').value;
        const email = document.getElementById('hr-signup-email').value;
        const password = document.getElementById('hr-signup-password').value;
        const confirmPassword = document.getElementById('hr-signup-confirm').value;

        if (password !== confirmPassword) {
            this.showErrorMessage('Passwords do not match.');
            return;
        }

        try {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';

            const user = await window.FirebaseConfig.signUpAsHR(email, password, name);
            this.currentUser = user;
            this.userRole = 'hr';
            this.isAuthenticated = true;

            this.hideModal('hr-login-modal');
            this.showSuccessMessage('HR account created successfully!');
            await this.initializeApp();
        } catch (error) {
            console.error('HR sign-up error:', error);
            this.showErrorMessage(error.message || 'Failed to create HR account.');
        } finally {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create HR Account';
        }
    }

    async handleEmployeeSignIn(event) {
        const form = event.target;
        const email = document.getElementById('employee-email').value;
        const password = document.getElementById('employee-password').value;

        try {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';

            const user = await window.FirebaseConfig.signInAsEmployee(email, password);
            this.currentUser = user;
            this.userRole = 'employee';
            this.isAuthenticated = true;

            this.hideModal('employee-login-modal');
            await this.initializeApp();
        } catch (error) {
            console.error('Employee sign-in error:', error);
            this.showErrorMessage(error.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    }

    async handleEmployeeSignUp(event) {
        const form = event.target;
        const name = document.getElementById('employee-signup-name').value;
        const email = document.getElementById('employee-signup-email').value;
        const password = document.getElementById('employee-signup-password').value;
        const confirmPassword = document.getElementById('employee-signup-confirm').value;

        if (password !== confirmPassword) {
            this.showErrorMessage('Passwords do not match.');
            return;
        }

        try {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';

            const result = await window.FirebaseConfig.signUpAsEmployee(email, password, name);
            
            this.hideModal('employee-login-modal');
            
            if (result.isAutoApproved) {
                this.currentUser = result.user;
                this.userRole = 'employee';
                this.isAuthenticated = true;
                this.showSuccessMessage('Account created and approved automatically!');
                await this.initializeApp();
            } else {
                this.showSuccessMessage('Account created successfully! Please wait for HR approval before signing in.');
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Employee sign-up error:', error);
            this.showErrorMessage(error.message || 'Failed to create account.');
        } finally {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    }

    async createUserProfile(user) {
        try {
            const existingUser = await window.FirebaseConfig.firestoreService.getUser(user.uid);
            if (!existingUser) {
                await window.FirebaseConfig.firestoreService.createUser({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    role: 'employee', // Default role
                    department: 'General',
                    joinDate: new Date().toISOString(),
                    status: 'pending' // New users start as pending
                });
                
                // Show pending approval message
                this.showPendingApprovalMessage();
                return;
            } else if (existingUser.status === 'pending') {
                this.showPendingApprovalMessage();
                return;
            } else if (existingUser.status === 'rejected') {
                this.showRejectedAccountMessage(existingUser.rejectionReason);
                return;
            }
        } catch (error) {
            console.error('Error creating user profile:', error);
        }
    }

    async logout() {
        try {
            await window.FirebaseConfig.signOut();
            this.currentUser = null;
            this.userRole = null;
            this.isAuthenticated = false;
            
            // Cleanup components
            this.cleanup();
            
            // Show login screen
            this.showLoginScreen();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async initializeApp() {
        try {
            // Update UI with user info
            this.updateUserInfo();
            
            // Initialize components
            await this.initializeComponents();
            
            // Show main app
            this.showMainApp();
            
            // Load initial data
            await this.loadInitialData();
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showErrorMessage('Failed to initialize application');
        }
    }

    updateUserInfo() {
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        const userRoleElement = document.getElementById('user-role');
        const userAvatarElement = document.getElementById('user-avatar');

        if (userNameElement && this.currentUser) {
            userNameElement.textContent = this.currentUser.displayName || this.currentUser.email;
        }

        if (userEmailElement && this.currentUser) {
            userEmailElement.textContent = this.currentUser.email;
        }

        if (userRoleElement && this.userRole) {
            userRoleElement.textContent = this.userRole.charAt(0).toUpperCase() + this.userRole.slice(1);
        }

        if (userAvatarElement && this.currentUser) {
            userAvatarElement.src = this.currentUser.photoURL || 'https://via.placeholder.com/32';
        }
        
        // Show/hide HR-only navigation elements
        const hrNavElements = document.querySelectorAll('#reports-nav, #users-nav');
        hrNavElements.forEach(el => {
            el.style.display = this.userRole === 'hr' ? 'flex' : 'none';
        });
    }

    async initializeComponents() {
        try {
            // Initialize leave manager
            if (window.leaveManager) {
                await window.leaveManager.loadUserData(this.currentUser, this.userRole);
            }

            // Initialize calendar
            if (window.calendarManager) {
                await window.calendarManager.loadUserData(this.currentUser, this.userRole);
            }

            // Update AI chatbot context
            if (window.aiChatbot) {
                window.aiChatbot.updateUser(this.currentUser, this.userRole);
            }

        } catch (error) {
            console.error('Error initializing components:', error);
        }
    }

    async loadInitialData() {
        try {
            // Load notifications
            await this.loadNotifications();
            
            // Refresh current view
            this.refreshCurrentView();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        this.currentView = viewName;

        // Trigger view-specific actions
        this.onViewChange(viewName);
    }

    onViewChange(viewName) {
        switch (viewName) {
            case 'calendar':
                if (window.calendarManager) {
                    window.calendarManager.refresh();
                }
                break;
            case 'reports':
                if (this.userRole === 'hr') {
                    this.loadReportsData();
                }
                break;
            case 'users':
                if (this.userRole === 'hr') {
                    this.loadUsersData();
                }
                break;
            case 'requests':
                if (window.leaveManager) {
                    window.leaveManager.filterRequests();
                }
                break;
        }
    }

    refreshCurrentView() {
        this.onViewChange(this.currentView);
    }

    async loadNotifications() {
        if (!this.currentUser) return;

        try {
            this.notifications = await window.FirebaseConfig.firestoreService.getNotifications(this.currentUser.uid);
            this.updateNotificationUI();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    updateNotificationUI() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-count');
        
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }

        this.renderNotifications();
    }

    renderNotifications() {
        const container = document.getElementById('notifications-content');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell"></i>
                    <p>No notifications</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" 
                 onclick="app.markNotificationAsRead('${notification.id}')">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                <span class="time">${window.utils.formatTimeAgo(notification.createdAt)}</span>
            </div>
        `).join('');
    }

    toggleNotifications() {
        const panel = document.getElementById('notifications-panel');
        if (panel) {
            panel.classList.toggle('show');
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            await window.FirebaseConfig.firestoreService.markNotificationAsRead(notificationId);
            
            // Update local state
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
            }
            
            this.updateNotificationUI();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllNotificationsAsRead() {
        try {
            await window.FirebaseConfig.firestoreService.markAllNotificationsAsRead(this.currentUser.uid);
            
            // Update local state
            this.notifications.forEach(n => n.read = true);
            
            this.updateNotificationUI();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }

    toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    closeDropdowns(e) {
        // Close user menu if clicking outside
        const userMenu = document.getElementById('user-dropdown');
        const userBtn = document.getElementById('user-menu-btn');
        
        if (userMenu && !userBtn.contains(e.target)) {
            userMenu.classList.remove('show');
        }

        // Close notifications if clicking outside
        const notificationsPanel = document.getElementById('notifications-panel');
        const notificationsBtn = document.getElementById('notifications-btn');
        
        if (notificationsPanel && !notificationsBtn.contains(e.target)) {
            notificationsPanel.classList.remove('show');
        }
    }

    handleKeyboardShortcuts(e) {
        // Alt + number for quick navigation
        if (e.altKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.switchView('dashboard');
                    break;
                case '2':
                    e.preventDefault();
                    this.switchView('requests');
                    break;
                case '3':
                    e.preventDefault();
                    this.switchView('calendar');
                    break;
                case '4':
                    if (this.userRole === 'hr') {
                        e.preventDefault();
                        this.switchView('reports');
                    }
                    break;
                case 'n':
                    e.preventDefault();
                    if (window.leaveManager) {
                        window.leaveManager.openRequestModal();
                    }
                    break;
            }
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            this.closeAllModals();
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    handleResize() {
        // Handle responsive behavior
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            // Close panels on mobile
            document.getElementById('notifications-panel')?.classList.remove('show');
            document.getElementById('user-dropdown')?.classList.remove('show');
        }
    }

    async loadReportsData() {
        if (this.userRole !== 'hr') return;

        try {
            // In a real application, this would load actual analytics data
            console.log('Loading reports data...');
            
            // Placeholder for report generation
            this.generateMockCharts();
            
        } catch (error) {
            console.error('Error loading reports data:', error);
        }
    }

    generateMockCharts() {
        // Placeholder for chart generation
        // In production, this would use a charting library like Chart.js or D3.js
        const utilizationChart = document.getElementById('utilization-chart');
        const trendsChart = document.getElementById('trends-chart');

        if (utilizationChart) {
            utilizationChart.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-chart-pie" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                    <p>Leave utilization analytics would be displayed here</p>
                    <p style="font-size: 0.875rem; color: var(--text-secondary);">
                        Integration with Chart.js or similar library required
                    </p>
                </div>
            `;
        }

        if (trendsChart) {
            trendsChart.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-chart-line" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                    <p>Monthly trends analysis would be displayed here</p>
                    <p style="font-size: 0.875rem; color: var(--text-secondary);">
                        Integration with Chart.js or similar library required
                    </p>
                </div>
            `;
        }
    }

    showLoading() {
        document.getElementById('loading-screen')?.classList.remove('hidden');
        document.getElementById('login-screen')?.classList.add('hidden');
        document.getElementById('main-app')?.classList.add('hidden');
    }

    showLoginScreen() {
        document.getElementById('loading-screen')?.classList.add('hidden');
        document.getElementById('login-screen')?.classList.remove('hidden');
        document.getElementById('main-app')?.classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('loading-screen')?.classList.add('hidden');
        document.getElementById('login-screen')?.classList.add('hidden');
        document.getElementById('main-app')?.classList.remove('hidden');
    }

    showErrorMessage(message) {
        // Simple alert for now - in production, use a proper toast notification
        alert('Error: ' + message);
    }

    showSuccessMessage(message) {
        // Simple alert for now - in production, use a proper toast notification
        alert(message);
    }

    showPendingApprovalMessage() {
        const loginScreen = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');
        
        // Hide main app and show pending message
        mainApp?.classList.add('hidden');
        loginScreen?.classList.remove('hidden');
        
        // Update login screen with pending message
        const loginContainer = document.querySelector('.login-container');
        if (loginContainer) {
            loginContainer.innerHTML = `
                <div class="logo-container">
                    <div class="logo-placeholder">
                        <img src="attached_assets/logo_1750231083606.png" alt="HR Leave Manager" style="height: 60px; margin-bottom: 1rem;">
                        <h1>HR Leave Manager</h1>
                    </div>
                </div>
                <div class="pending-approval">
                    <div class="status-icon">
                        <i class="fas fa-clock" style="color: #f59e0b; font-size: 3rem;"></i>
                    </div>
                    <h2>Account Pending Approval</h2>
                    <p>Your account has been registered successfully and is awaiting HR approval. You will receive a notification once your account is approved.</p>
                    <p><strong>Email:</strong> ${this.currentUser?.email}</p>
                    <div class="pending-actions">
                        <button class="btn btn-secondary" onclick="hrApp.logout()">Sign Out</button>
                    </div>
                </div>
            `;
        }
    }

    showRejectedAccountMessage(reason) {
        const loginScreen = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');
        
        // Hide main app and show rejection message
        mainApp?.classList.add('hidden');
        loginScreen?.classList.remove('hidden');
        
        // Update login screen with rejection message
        const loginContainer = document.querySelector('.login-container');
        if (loginContainer) {
            loginContainer.innerHTML = `
                <div class="logo-container">
                    <div class="logo-placeholder">
                        <img src="attached_assets/logo_1750231083606.png" alt="HR Leave Manager" style="height: 60px; margin-bottom: 1rem;">
                        <h1>HR Leave Manager</h1>
                    </div>
                </div>
                <div class="rejected-account">
                    <div class="status-icon">
                        <i class="fas fa-times-circle" style="color: #ef4444; font-size: 3rem;"></i>
                    </div>
                    <h2>Account Not Approved</h2>
                    <p>Your account registration was not approved by HR.</p>
                    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                    <p>Please contact HR for more information or to discuss your application.</p>
                    <div class="rejected-actions">
                        <button class="btn btn-secondary" onclick="hrApp.logout()">Sign Out</button>
                    </div>
                </div>
            `;
        }
    }

    async loadUsersData() {
        if (this.userRole !== 'hr') return;
        
        try {
            // Load pending users
            const pendingUsers = await window.FirebaseConfig.firestoreService.getPendingUsers();
            this.displayPendingUsers(pendingUsers);
            
            // Load all users
            const allUsers = await window.FirebaseConfig.firestoreService.getAllUsers();
            this.displayAllUsers(allUsers);
            
        } catch (error) {
            console.error('Error loading users data:', error);
        }
    }

    displayPendingUsers(users) {
        const pendingContainer = document.getElementById('pending-users');
        if (!pendingContainer) return;
        
        if (users.length === 0) {
            pendingContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-clock"></i>
                    <p>No pending user approvals</p>
                </div>
            `;
            return;
        }
        
        const usersHTML = users.map(user => `
            <div class="user-card">
                <div class="user-info">
                    <div class="user-name">${user.displayName || 'No Name'}</div>
                    <div class="user-email">${user.email}</div>
                </div>
                <div class="user-meta">
                    <span><i class="fas fa-building"></i> ${user.department || 'General'}</span>
                    <span><i class="fas fa-calendar"></i> ${Utils.DateHelper.format(user.createdAt?.toDate?.() || new Date())}</span>
                </div>
                <div class="user-actions">
                    <button class="btn-approve" onclick="hrApp.approveUser('${user.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-reject" onclick="hrApp.showRejectUserModal('${user.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `).join('');
        
        pendingContainer.innerHTML = usersHTML;
    }

    displayAllUsers(users) {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody) return;
        
        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>No users found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const usersHTML = users.map(user => `
            <tr>
                <td>${user.displayName || 'No Name'}</td>
                <td>${user.email}</td>
                <td>${user.department || 'General'}</td>
                <td>
                    <span class="status-badge status-${user.status}">
                        ${Utils.StringHelper.capitalize(user.status || 'pending')}
                    </span>
                </td>
                <td>${Utils.DateHelper.format(user.createdAt?.toDate?.() || new Date())}</td>
                <td>
                    ${user.status === 'pending' ? `
                        <button class="btn btn-sm btn-primary" onclick="hrApp.approveUser('${user.id}')">Approve</button>
                        <button class="btn btn-sm btn-danger" onclick="hrApp.showRejectUserModal('${user.id}')">Reject</button>
                    ` : user.status === 'approved' ? `
                        <button class="btn btn-sm btn-secondary" onclick="hrApp.deactivateUser('${user.id}')">Deactivate</button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = usersHTML;
    }

    async approveUser(userId) {
        try {
            await window.FirebaseConfig.firestoreService.approveUser(userId);
            this.showSuccessMessage('User approved successfully');
            this.loadUsersData(); // Refresh the display
        } catch (error) {
            console.error('Error approving user:', error);
            this.showErrorMessage('Failed to approve user');
        }
    }

    showRejectUserModal(userId) {
        const modal = document.getElementById('reject-user-modal');
        const form = document.getElementById('reject-user-form');
        form.dataset.userId = userId;
        this.showModal('reject-user-modal');
    }

    async deactivateUser(userId) {
        if (confirm('Are you sure you want to deactivate this user? This will cancel all their pending leave requests.')) {
            try {
                await window.FirebaseConfig.firestoreService.deleteEmployee(userId);
                this.showSuccessMessage('User deactivated successfully');
                this.loadUsersData();
            } catch (error) {
                console.error('Error deactivating user:', error);
                this.showErrorMessage('Failed to deactivate user');
            }
        }
    }

    cleanup() {
        // Cleanup components
        if (window.leaveManager) {
            window.leaveManager.cleanup();
        }

        if (window.calendarManager) {
            window.calendarManager.cleanup();
        }

        if (window.aiChatbot) {
            window.aiChatbot.clearChat();
        }
    }

    // HR User Management Methods
    async handleCreateEmployee(event) {
        const form = event.target;
        const name = document.getElementById('new-employee-name').value;
        const email = document.getElementById('new-employee-email').value;
        const department = document.getElementById('new-employee-department').value;
        const position = document.getElementById('new-employee-position').value;

        try {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Employee...';

            const employeeData = {
                displayName: name,
                email: email,
                department: department,
                position: position
            };

            await window.FirebaseConfig.firestoreService.createEmployeeByHR(employeeData);
            
            this.hideModal('create-employee-modal');
            this.showSuccessMessage(`Employee ${name} created successfully!`);
            form.reset();
            await this.loadUsersData();
        } catch (error) {
            console.error('Error creating employee:', error);
            this.showErrorMessage(error.message || 'Failed to create employee.');
        } finally {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Employee';
        }
    }

    async handleRejectUser(event) {
        const form = event.target;
        const reason = document.getElementById('rejection-reason').value;
        const userId = form.dataset.userId;

        try {
            await window.FirebaseConfig.firestoreService.rejectUser(userId, reason);
            this.hideModal('reject-user-modal');
            this.showSuccessMessage('User account rejected.');
            await this.loadUsersData();
        } catch (error) {
            console.error('Error rejecting user:', error);
            this.showErrorMessage('Failed to reject user account.');
        }
    }

    // Modal Control Methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    switchTab(parentModal, tabId) {
        // Remove active class from all tabs and content
        const tabs = parentModal.querySelectorAll('.tab-btn');
        const contents = parentModal.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => tab.classList.remove('active'));
        contents.forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        const selectedTab = parentModal.querySelector(`[data-tab="${tabId}"]`);
        const selectedContent = parentModal.querySelector(`#${tabId}`);
        
        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active');
            selectedContent.classList.add('active');
        }
    }

    // Public API methods
    getCurrentUser() {
        return this.currentUser;
    }

    getUserRole() {
        return this.userRole;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    getCurrentView() {
        return this.currentView;
    }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    // Initialize global components
    window.leaveManager = new LeaveManager();
    window.calendarManager = new CalendarManager();
    window.aiChatbot = new AIChatbot();
    
    // Initialize main app
    app = new HRLeaveApp();
    
    // Make globally available
    window.app = app;
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.app && window.app.isUserAuthenticated()) {
        // Refresh data when page becomes visible
        window.app.loadNotifications();
        window.app.refreshCurrentView();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    if (window.app && window.app.isUserAuthenticated()) {
        window.app.loadInitialData();
    }
});

window.addEventListener('offline', () => {
    console.log('Application is offline');
    // In production, you might want to show an offline indicator
});
