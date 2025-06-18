// Leave Management System
// Handles leave requests, approvals, balance tracking, and smart scheduling

class LeaveManager {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.leaveRequests = [];
        this.leaveBalance = null;
        this.notifications = [];
        this.unsubscribeFunctions = [];
        
        this.init();
        this.setupEventListeners();
    }

    init() {
        // Get DOM elements
        this.elements = {
            // Dashboard elements
            availableDays: document.getElementById('available-days'),
            usedDays: document.getElementById('used-days'),
            pendingRequests: document.getElementById('pending-requests'),
            teamRequests: document.getElementById('team-requests'),
            recentRequests: document.getElementById('recent-requests'),
            upcomingLeave: document.getElementById('upcoming-leave'),
            
            // Request elements
            requestsTableBody: document.getElementById('requests-table-body'),
            searchRequests: document.getElementById('search-requests'),
            filterStatus: document.getElementById('filter-status'),
            
            // Modal elements
            leaveRequestModal: document.getElementById('leave-request-modal'),
            requestDetailsModal: document.getElementById('request-details-modal'),
            leaveRequestForm: document.getElementById('leave-request-form'),
            requestDetailsContent: document.getElementById('request-details-content'),
            
            // Form elements
            leaveType: document.getElementById('leave-type'),
            startDate: document.getElementById('start-date'),
            endDate: document.getElementById('end-date'),
            leaveReason: document.getElementById('leave-reason'),
            smartSuggestions: document.getElementById('smart-suggestions'),
            suggestionsList: document.getElementById('suggestions-list'),
            
            // Navigation elements
            reportsNav: document.getElementById('reports-nav'),
            teamStat: document.getElementById('team-stat')
        };
    }

    setupEventListeners() {
        // Quick request buttons
        document.getElementById('quick-request-btn')?.addEventListener('click', () => this.openRequestModal());
        document.getElementById('new-request-btn')?.addEventListener('click', () => this.openRequestModal());
        
        // Form submission
        this.elements.leaveRequestForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Date change listeners for smart suggestions
        this.elements.startDate?.addEventListener('change', () => this.updateSmartSuggestions());
        this.elements.endDate?.addEventListener('change', () => this.updateSmartSuggestions());
        this.elements.leaveType?.addEventListener('change', () => this.updateSmartSuggestions());
        
        // Search and filter
        this.elements.searchRequests?.addEventListener('input', () => this.filterRequests());
        this.elements.filterStatus?.addEventListener('change', () => this.filterRequests());
        
        // Modal close handlers
        document.querySelectorAll('[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.closest('[data-modal]').dataset.modal;
                this.closeModal(modalId);
            });
        });
        
        // Modal background close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    async loadUserData(user, role) {
        this.currentUser = user;
        this.userRole = role;
        
        try {
            // Load leave balance
            if (user) {
                this.leaveBalance = await window.FirebaseConfig.firestoreService.getLeaveBalance(user.uid);
                this.updateDashboardStats();
            }
            
            // Setup real-time listeners
            this.setupRealtimeListeners();
            
            // Load initial data
            await this.loadLeaveRequests();
            await this.loadNotifications();
            
            // Update UI based on role
            this.updateUIForRole(role);
            
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showErrorMessage('Failed to load user data');
        }
    }

    updateUIForRole(role) {
        if (role === 'hr') {
            this.elements.reportsNav.style.display = 'block';
            this.elements.teamStat.style.display = 'block';
        } else {
            this.elements.reportsNav.style.display = 'none';
            this.elements.teamStat.style.display = 'none';
        }
    }

    setupRealtimeListeners() {
        if (!this.currentUser) return;
        
        // Listen to leave requests
        const requestsFilter = this.userRole === 'hr' ? {} : { userId: this.currentUser.uid };
        const unsubscribeRequests = window.FirebaseConfig.firestoreService.onLeaveRequestsChange(
            (requests) => {
                this.leaveRequests = requests;
                this.updateRequestsDisplay();
                this.updateDashboardStats();
            },
            requestsFilter
        );
        this.unsubscribeFunctions.push(unsubscribeRequests);
        
        // Listen to notifications
        const unsubscribeNotifications = window.FirebaseConfig.firestoreService.onNotificationsChange(
            this.currentUser.uid,
            (notifications) => {
                this.notifications = notifications;
                this.updateNotificationsDisplay();
            }
        );
        this.unsubscribeFunctions.push(unsubscribeNotifications);
    }

    updateDashboardStats() {
        if (!this.leaveBalance) return;
        
        // Calculate available and used days
        const availableVacation = this.leaveBalance.vacation - (this.leaveBalance.used?.vacation || 0);
        const totalUsed = Object.values(this.leaveBalance.used || {}).reduce((sum, val) => sum + val, 0);
        
        // Update stats
        if (this.elements.availableDays) {
            this.elements.availableDays.textContent = availableVacation;
        }
        if (this.elements.usedDays) {
            this.elements.usedDays.textContent = totalUsed;
        }
        
        // Count pending requests
        const pendingCount = this.leaveRequests.filter(req => 
            req.status === 'pending' && 
            (this.userRole === 'hr' || req.userId === this.currentUser.uid)
        ).length;
        
        if (this.elements.pendingRequests) {
            this.elements.pendingRequests.textContent = pendingCount;
        }
        
        // HR: Count team requests
        if (this.userRole === 'hr' && this.elements.teamRequests) {
            this.elements.teamRequests.textContent = this.leaveRequests.length;
        }
        
        // Update recent requests
        this.updateRecentRequests();
        this.updateUpcomingLeave();
    }

    updateRecentRequests() {
        if (!this.elements.recentRequests) return;
        
        const recentRequests = this.leaveRequests
            .filter(req => this.userRole === 'hr' || req.userId === this.currentUser.uid)
            .slice(0, 5);
        
        if (recentRequests.length === 0) {
            this.elements.recentRequests.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-alt"></i>
                    <p>No recent requests</p>
                </div>
            `;
            return;
        }
        
        this.elements.recentRequests.innerHTML = recentRequests.map(request => `
            <div class="request-item ${request.status}" onclick="leaveManager.showRequestDetails('${request.id}')">
                <div class="request-info">
                    <h4>${request.employeeName || 'Unknown Employee'}</h4>
                    <p>${request.leaveType} • ${this.formatDateRange(request.startDate, request.endDate)}</p>
                </div>
                <span class="status-badge ${request.status}">${request.status}</span>
            </div>
        `).join('');
    }

    updateUpcomingLeave() {
        if (!this.elements.upcomingLeave) return;
        
        const upcoming = this.leaveRequests
            .filter(req => {
                const startDate = new Date(req.startDate);
                const today = new Date();
                return req.status === 'approved' && startDate > today && 
                       (this.userRole === 'hr' || req.userId === this.currentUser.uid);
            })
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
            .slice(0, 3);
        
        if (upcoming.length === 0) {
            this.elements.upcomingLeave.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar"></i>
                    <p>No upcoming leave</p>
                </div>
            `;
            return;
        }
        
        this.elements.upcomingLeave.innerHTML = upcoming.map(request => `
            <div class="leave-item">
                <div class="leave-date">
                    <span class="day">${new Date(request.startDate).getDate()}</span>
                    <span class="month">${new Date(request.startDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div class="leave-info">
                    <h4>${request.employeeName || 'Your Leave'}</h4>
                    <p>${request.leaveType} • ${this.calculateDays(request.startDate, request.endDate)} days</p>
                </div>
            </div>
        `).join('');
    }

    async loadLeaveRequests() {
        try {
            const filters = this.userRole === 'hr' ? {} : { userId: this.currentUser.uid };
            this.leaveRequests = await window.FirebaseConfig.firestoreService.getLeaveRequests(filters);
            this.updateRequestsDisplay();
        } catch (error) {
            console.error('Error loading leave requests:', error);
        }
    }

    updateRequestsDisplay() {
        if (!this.elements.requestsTableBody) return;
        
        const filteredRequests = this.getFilteredRequests();
        
        if (filteredRequests.length === 0) {
            this.elements.requestsTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7">
                        <div class="empty-state">
                            <i class="fas fa-calendar-plus"></i>
                            <p>No leave requests found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        this.elements.requestsTableBody.innerHTML = filteredRequests.map(request => `
            <tr onclick="leaveManager.showRequestDetails('${request.id}')" style="cursor: pointer;">
                <td>${request.employeeName || 'Unknown Employee'}</td>
                <td><span class="leave-type-badge ${request.leaveType}">${this.formatLeaveType(request.leaveType)}</span></td>
                <td>${this.formatDate(request.startDate)}</td>
                <td>${this.formatDate(request.endDate)}</td>
                <td>${this.calculateDays(request.startDate, request.endDate)}</td>
                <td><span class="status-badge ${request.status}">${request.status}</span></td>
                <td>
                    <div class="action-buttons">
                        ${this.generateActionButtons(request)}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    generateActionButtons(request) {
        let buttons = `<button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); leaveManager.showRequestDetails('${request.id}')">View</button>`;
        
        if (this.userRole === 'hr' && request.status === 'pending') {
            buttons += `
                <button class="btn btn-small btn-success" onclick="event.stopPropagation(); leaveManager.approveRequest('${request.id}')">Approve</button>
                <button class="btn btn-small btn-error" onclick="event.stopPropagation(); leaveManager.rejectRequest('${request.id}')">Reject</button>
            `;
        } else if (request.userId === this.currentUser?.uid && request.status === 'pending') {
            buttons += `<button class="btn btn-small btn-warning" onclick="event.stopPropagation(); leaveManager.cancelRequest('${request.id}')">Cancel</button>`;
        }
        
        return buttons;
    }

    getFilteredRequests() {
        let filtered = [...this.leaveRequests];
        
        // Search filter
        const searchTerm = this.elements.searchRequests?.value.toLowerCase() || '';
        if (searchTerm) {
            filtered = filtered.filter(request => 
                (request.employeeName || '').toLowerCase().includes(searchTerm) ||
                request.leaveType.toLowerCase().includes(searchTerm) ||
                (request.reason || '').toLowerCase().includes(searchTerm)
            );
        }
        
        // Status filter
        const statusFilter = this.elements.filterStatus?.value || '';
        if (statusFilter) {
            filtered = filtered.filter(request => request.status === statusFilter);
        }
        
        return filtered;
    }

    filterRequests() {
        this.updateRequestsDisplay();
    }

    openRequestModal() {
        this.showModal('leave-request-modal');
        this.resetForm();
        this.setMinDate();
    }

    resetForm() {
        if (this.elements.leaveRequestForm) {
            this.elements.leaveRequestForm.reset();
        }
        if (this.elements.smartSuggestions) {
            this.elements.smartSuggestions.style.display = 'none';
        }
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        if (this.elements.startDate) {
            this.elements.startDate.min = today;
        }
        if (this.elements.endDate) {
            this.elements.endDate.min = today;
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showErrorMessage('Please log in to submit a leave request');
            return;
        }
        
        const formData = new FormData(e.target);
        const requestData = {
            userId: this.currentUser.uid,
            employeeName: this.currentUser.displayName || this.currentUser.email,
            employeeEmail: this.currentUser.email,
            leaveType: this.elements.leaveType.value,
            startDate: this.elements.startDate.value,
            endDate: this.elements.endDate.value,
            reason: this.elements.leaveReason.value || '',
            days: this.calculateDays(this.elements.startDate.value, this.elements.endDate.value)
        };
        
        // Validate request
        const validation = this.validateLeaveRequest(requestData);
        if (!validation.valid) {
            this.showErrorMessage(validation.message);
            return;
        }
        
        try {
            // Check for conflicts
            const conflicts = await this.checkForConflicts(requestData);
            if (conflicts.length > 0 && !confirm('This request conflicts with existing leave. Continue anyway?')) {
                return;
            }
            
            // Submit request
            const requestId = await window.FirebaseConfig.firestoreService.createLeaveRequest(requestData);
            
            // Create notification for HR
            await this.createNotificationForHR(requestData, requestId);
            
            this.showSuccessMessage('Leave request submitted successfully');
            this.closeModal('leave-request-modal');
            
            // Refresh data
            await this.loadLeaveRequests();
            
        } catch (error) {
            console.error('Error submitting leave request:', error);
            this.showErrorMessage('Failed to submit leave request');
        }
    }

    validateLeaveRequest(requestData) {
        // Check if end date is after start date
        if (new Date(requestData.endDate) < new Date(requestData.startDate)) {
            return { valid: false, message: 'End date must be after start date' };
        }
        
        // Check if dates are in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(requestData.startDate) < today) {
            return { valid: false, message: 'Start date must be in the future' };
        }
        
        // Check leave balance
        if (this.leaveBalance) {
            const leaveType = requestData.leaveType;
            const available = this.leaveBalance[leaveType] - (this.leaveBalance.used?.[leaveType] || 0);
            if (requestData.days > available) {
                return { valid: false, message: `Insufficient ${leaveType} balance. Available: ${available} days` };
            }
        }
        
        return { valid: true };
    }

    async checkForConflicts(requestData) {
        try {
            const allRequests = await window.FirebaseConfig.firestoreService.getLeaveRequests({
                startDate: requestData.startDate
            });
            
            return allRequests.filter(request => {
                if (request.status !== 'approved') return false;
                if (request.userId === requestData.userId) return false;
                
                const reqStart = new Date(requestData.startDate);
                const reqEnd = new Date(requestData.endDate);
                const existingStart = new Date(request.startDate);
                const existingEnd = new Date(request.endDate);
                
                return (reqStart <= existingEnd && reqEnd >= existingStart);
            });
        } catch (error) {
            console.error('Error checking conflicts:', error);
            return [];
        }
    }

    async updateSmartSuggestions() {
        if (!this.elements.startDate.value || !this.elements.endDate.value) {
            this.elements.smartSuggestions.style.display = 'none';
            return;
        }
        
        const requestData = {
            startDate: this.elements.startDate.value,
            endDate: this.elements.endDate.value,
            leaveType: this.elements.leaveType.value
        };
        
        try {
            const conflicts = await this.checkForConflicts(requestData);
            const suggestions = this.generateSmartSuggestions(requestData, conflicts);
            
            if (suggestions.length > 0) {
                this.displaySmartSuggestions(suggestions);
            } else {
                this.elements.smartSuggestions.style.display = 'none';
            }
        } catch (error) {
            console.error('Error generating suggestions:', error);
        }
    }

    generateSmartSuggestions(requestData, conflicts) {
        const suggestions = [];
        
        if (conflicts.length > 0) {
            // Suggest alternative dates
            const startDate = new Date(requestData.startDate);
            const endDate = new Date(requestData.endDate);
            const duration = this.calculateDays(requestData.startDate, requestData.endDate);
            
            // Try one week later
            const altStart1 = new Date(startDate);
            altStart1.setDate(altStart1.getDate() + 7);
            const altEnd1 = new Date(altStart1);
            altEnd1.setDate(altEnd1.getDate() + duration - 1);
            
            suggestions.push({
                type: 'alternative',
                message: 'Consider moving your leave to avoid conflicts',
                startDate: altStart1.toISOString().split('T')[0],
                endDate: altEnd1.toISOString().split('T')[0],
                reason: 'Avoids team conflicts'
            });
            
            // Try two weeks later
            const altStart2 = new Date(startDate);
            altStart2.setDate(altStart2.getDate() + 14);
            const altEnd2 = new Date(altStart2);
            altEnd2.setDate(altEnd2.getDate() + duration - 1);
            
            suggestions.push({
                type: 'alternative',
                message: 'Alternative option for better coverage',
                startDate: altStart2.toISOString().split('T')[0],
                endDate: altEnd2.toISOString().split('T')[0],
                reason: 'Optimal team coverage'
            });
        }
        
        return suggestions;
    }

    displaySmartSuggestions(suggestions) {
        this.elements.suggestionsList.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" onclick="leaveManager.applySuggestion(${index})">
                <h5>${suggestion.message}</h5>
                <p><strong>Dates:</strong> ${this.formatDate(suggestion.startDate)} - ${this.formatDate(suggestion.endDate)}</p>
                <p><strong>Reason:</strong> ${suggestion.reason}</p>
            </div>
        `).join('');
        
        this.currentSuggestions = suggestions;
        this.elements.smartSuggestions.style.display = 'block';
    }

    applySuggestion(index) {
        const suggestion = this.currentSuggestions[index];
        this.elements.startDate.value = suggestion.startDate;
        this.elements.endDate.value = suggestion.endDate;
        this.elements.smartSuggestions.style.display = 'none';
    }

    async approveRequest(requestId) {
        try {
            await window.FirebaseConfig.firestoreService.updateLeaveRequest(requestId, {
                status: 'approved',
                approvedBy: this.currentUser.uid,
                approvedAt: new Date().toISOString()
            });
            
            // Update leave balance
            const request = this.leaveRequests.find(r => r.id === requestId);
            if (request) {
                await this.updateLeaveBalance(request.userId, request.leaveType, request.days);
                await this.createNotificationForEmployee(request, 'approved');
            }
            
            this.showSuccessMessage('Leave request approved');
        } catch (error) {
            console.error('Error approving request:', error);
            this.showErrorMessage('Failed to approve request');
        }
    }

    async rejectRequest(requestId) {
        const reason = prompt('Please provide a reason for rejection (optional):');
        
        try {
            await window.FirebaseConfig.firestoreService.updateLeaveRequest(requestId, {
                status: 'rejected',
                rejectedBy: this.currentUser.uid,
                rejectedAt: new Date().toISOString(),
                rejectionReason: reason || ''
            });
            
            const request = this.leaveRequests.find(r => r.id === requestId);
            if (request) {
                await this.createNotificationForEmployee(request, 'rejected', reason);
            }
            
            this.showSuccessMessage('Leave request rejected');
        } catch (error) {
            console.error('Error rejecting request:', error);
            this.showErrorMessage('Failed to reject request');
        }
    }

    async cancelRequest(requestId) {
        if (!confirm('Are you sure you want to cancel this leave request?')) {
            return;
        }
        
        try {
            await window.FirebaseConfig.firestoreService.deleteLeaveRequest(requestId);
            this.showSuccessMessage('Leave request cancelled');
        } catch (error) {
            console.error('Error cancelling request:', error);
            this.showErrorMessage('Failed to cancel request');
        }
    }

    async updateLeaveBalance(userId, leaveType, days) {
        try {
            const balance = await window.FirebaseConfig.firestoreService.getLeaveBalance(userId);
            const updatedUsed = { ...balance.used };
            updatedUsed[leaveType] = (updatedUsed[leaveType] || 0) + days;
            
            await window.FirebaseConfig.firestoreService.updateLeaveBalance(userId, {
                used: updatedUsed
            });
        } catch (error) {
            console.error('Error updating leave balance:', error);
        }
    }

    async createNotificationForHR(requestData, requestId) {
        try {
            // Get all HR users (in a real app, you'd query for users with HR role)
            const hrNotification = {
                userId: 'hr-demo-user', // In production, send to all HR users
                title: 'New Leave Request',
                message: `${requestData.employeeName} has submitted a ${requestData.leaveType} leave request for ${this.formatDateRange(requestData.startDate, requestData.endDate)}`,
                type: 'leave_request',
                data: {
                    requestId: requestId,
                    action: 'review'
                }
            };
            
            await window.FirebaseConfig.firestoreService.createNotification(hrNotification);
        } catch (error) {
            console.error('Error creating HR notification:', error);
        }
    }

    async createNotificationForEmployee(request, status, reason = '') {
        try {
            let message = `Your ${request.leaveType} leave request for ${this.formatDateRange(request.startDate, request.endDate)} has been ${status}`;
            if (reason) {
                message += `. Reason: ${reason}`;
            }
            
            const notification = {
                userId: request.userId,
                title: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                message: message,
                type: 'leave_status',
                data: {
                    requestId: request.id,
                    status: status
                }
            };
            
            await window.FirebaseConfig.firestoreService.createNotification(notification);
        } catch (error) {
            console.error('Error creating employee notification:', error);
        }
    }

    showRequestDetails(requestId) {
        const request = this.leaveRequests.find(r => r.id === requestId);
        if (!request) return;
        
        const content = `
            <div class="request-details">
                <div class="detail-section">
                    <h4>Request Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Employee:</label>
                            <span>${request.employeeName}</span>
                        </div>
                        <div class="detail-item">
                            <label>Email:</label>
                            <span>${request.employeeEmail}</span>
                        </div>
                        <div class="detail-item">
                            <label>Leave Type:</label>
                            <span class="leave-type-badge ${request.leaveType}">${this.formatLeaveType(request.leaveType)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="status-badge ${request.status}">${request.status}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Dates & Duration</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Start Date:</label>
                            <span>${this.formatDate(request.startDate)}</span>
                        </div>
                        <div class="detail-item">
                            <label>End Date:</label>
                            <span>${this.formatDate(request.endDate)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Total Days:</label>
                            <span>${request.days || this.calculateDays(request.startDate, request.endDate)} days</span>
                        </div>
                    </div>
                </div>
                
                ${request.reason ? `
                <div class="detail-section">
                    <h4>Reason</h4>
                    <p>${request.reason}</p>
                </div>
                ` : ''}
                
                <div class="detail-section">
                    <h4>Request Timeline</h4>
                    <div class="timeline">
                        <div class="timeline-item">
                            <i class="fas fa-plus-circle"></i>
                            <div>
                                <strong>Submitted</strong>
                                <span>${this.formatDateTime(request.createdAt)}</span>
                            </div>
                        </div>
                        ${request.status === 'approved' ? `
                        <div class="timeline-item">
                            <i class="fas fa-check-circle"></i>
                            <div>
                                <strong>Approved</strong>
                                <span>${this.formatDateTime(request.approvedAt)}</span>
                            </div>
                        </div>
                        ` : ''}
                        ${request.status === 'rejected' ? `
                        <div class="timeline-item">
                            <i class="fas fa-times-circle"></i>
                            <div>
                                <strong>Rejected</strong>
                                <span>${this.formatDateTime(request.rejectedAt)}</span>
                                ${request.rejectionReason ? `<p>Reason: ${request.rejectionReason}</p>` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                ${this.userRole === 'hr' && request.status === 'pending' ? `
                <div class="detail-actions">
                    <button class="btn btn-success" onclick="leaveManager.approveRequest('${request.id}'); leaveManager.closeModal('request-details-modal');">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-error" onclick="leaveManager.rejectRequest('${request.id}'); leaveManager.closeModal('request-details-modal');">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
                ` : ''}
            </div>
        `;
        
        this.elements.requestDetailsContent.innerHTML = content;
        this.showModal('request-details-modal');
    }

    // Utility methods
    calculateDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatDateTime(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDateRange(startDate, endDate) {
        return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
    }

    formatLeaveType(type) {
        const types = {
            vacation: 'Vacation',
            sick: 'Sick Leave',
            personal: 'Personal',
            maternity: 'Maternity/Paternity',
            emergency: 'Emergency'
        };
        return types[type] || type;
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }

    showSuccessMessage(message) {
        // Simple alert for now - in production, use a proper toast notification
        alert(message);
    }

    showErrorMessage(message) {
        // Simple alert for now - in production, use a proper toast notification
        alert('Error: ' + message);
    }

    async loadNotifications() {
        if (!this.currentUser) return;
        
        try {
            this.notifications = await window.FirebaseConfig.firestoreService.getNotifications(this.currentUser.uid);
            this.updateNotificationsDisplay();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    updateNotificationsDisplay() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-count');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }

    cleanup() {
        // Unsubscribe from real-time listeners
        this.unsubscribeFunctions.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.unsubscribeFunctions = [];
    }
}

// Initialize leave manager
let leaveManager;
document.addEventListener('DOMContentLoaded', () => {
    leaveManager = new LeaveManager();
});
