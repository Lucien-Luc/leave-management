// Calendar functionality for displaying leave schedules and managing conflicts
// Provides visual representation of approved leaves and scheduling conflicts

class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.currentUser = null;
        this.userRole = null;
        this.leaveData = [];
        this.conflicts = [];
        this.selectedDate = null;
        
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.elements = {
            calendarGrid: document.getElementById('calendar-grid'),
            currentMonthYear: document.getElementById('current-month-year'),
            prevMonthBtn: document.getElementById('prev-month'),
            nextMonthBtn: document.getElementById('next-month'),
            todayBtn: document.getElementById('today-btn')
        };
    }

    setupEventListeners() {
        // Navigation controls
        this.elements.prevMonthBtn?.addEventListener('click', () => this.previousMonth());
        this.elements.nextMonthBtn?.addEventListener('click', () => this.nextMonth());
        this.elements.todayBtn?.addEventListener('click', () => this.goToToday());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (window.app?.getCurrentView() === 'calendar') {
                this.handleKeyboardNavigation(e);
            }
        });
    }

    async loadUserData(user, role) {
        this.currentUser = user;
        this.userRole = role;
        
        try {
            await this.loadLeaveData();
            this.renderCalendar();
        } catch (error) {
            console.error('Error loading calendar data:', error);
        }
    }

    async loadLeaveData() {
        if (!this.currentUser) return;

        try {
            // Get date range for current month view
            const startOfMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            const endOfMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
            
            // Load leave requests for the current month
            const filters = this.userRole === 'hr' ? {
                startDate: startOfMonth.toISOString().split('T')[0],
                endDate: endOfMonth.toISOString().split('T')[0]
            } : {
                userId: this.currentUser.uid,
                startDate: startOfMonth.toISOString().split('T')[0],
                endDate: endOfMonth.toISOString().split('T')[0]
            };

            this.leaveData = await window.FirebaseConfig.firestoreService.getLeaveRequests(filters);
            
            // Detect conflicts if HR
            if (this.userRole === 'hr') {
                this.detectConflicts();
            }
            
        } catch (error) {
            console.error('Error loading leave data:', error);
            this.leaveData = [];
        }
    }

    detectConflicts() {
        this.conflicts = [];
        const approvedLeaves = this.leaveData.filter(leave => leave.status === 'approved');
        
        for (let i = 0; i < approvedLeaves.length; i++) {
            for (let j = i + 1; j < approvedLeaves.length; j++) {
                const leave1 = approvedLeaves[i];
                const leave2 = approvedLeaves[j];
                
                if (this.leavesOverlap(leave1, leave2)) {
                    const conflictId = `${leave1.id}-${leave2.id}`;
                    if (!this.conflicts.find(c => c.id === conflictId)) {
                        this.conflicts.push({
                            id: conflictId,
                            leaves: [leave1, leave2],
                            startDate: this.getLatestDate(leave1.startDate, leave2.startDate),
                            endDate: this.getEarliestDate(leave1.endDate, leave2.endDate)
                        });
                    }
                }
            }
        }
    }

    leavesOverlap(leave1, leave2) {
        const start1 = new Date(leave1.startDate);
        const end1 = new Date(leave1.endDate);
        const start2 = new Date(leave2.startDate);
        const end2 = new Date(leave2.endDate);
        
        return start1 <= end2 && start2 <= end1;
    }

    getLatestDate(date1, date2) {
        return new Date(date1) > new Date(date2) ? date1 : date2;
    }

    getEarliestDate(date1, date2) {
        return new Date(date1) < new Date(date2) ? date1 : date2;
    }

    renderCalendar() {
        if (!this.elements.calendarGrid) return;

        // Update month/year display
        this.updateMonthYearDisplay();

        // Clear existing calendar
        this.elements.calendarGrid.innerHTML = '';

        // Create calendar header
        this.renderCalendarHeader();

        // Create calendar days
        this.renderCalendarDays();
    }

    updateMonthYearDisplay() {
        if (this.elements.currentMonthYear) {
            this.elements.currentMonthYear.textContent = this.currentDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
        }
    }

    renderCalendarHeader() {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        daysOfWeek.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-header-day';
            dayElement.textContent = day;
            dayElement.style.cssText = `
                background: var(--surface-color);
                padding: 0.75rem;
                text-align: center;
                font-weight: 600;
                color: var(--text-secondary);
                border-bottom: 2px solid var(--border-color);
            `;
            this.elements.calendarGrid.appendChild(dayElement);
        });
    }

    renderCalendarDays() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        // Generate 42 days (6 weeks)
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = this.createDayElement(date, month);
            this.elements.calendarGrid.appendChild(dayElement);
        }
    }

    createDayElement(date, currentMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // Check if date is in current month
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = this.isToday(date);
        const isSelected = this.selectedDate && this.isSameDate(date, this.selectedDate);
        
        // Apply classes
        if (!isCurrentMonth) {
            dayElement.classList.add('other-month');
        }
        if (isToday) {
            dayElement.classList.add('today');
        }
        if (isSelected) {
            dayElement.classList.add('selected');
        }
        
        // Create day content
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayElement.appendChild(dayNumber);
        
        // Add leave indicators
        const leaves = this.getLeavesForDate(date);
        const conflicts = this.getConflictsForDate(date);
        
        if (conflicts.length > 0) {
            conflicts.forEach(conflict => {
                const indicator = document.createElement('div');
                indicator.className = 'leave-indicator conflict';
                indicator.title = `Conflict: ${conflict.leaves.map(l => l.employeeName).join(', ')}`;
                dayElement.appendChild(indicator);
            });
        }
        
        if (leaves.length > 0) {
            leaves.forEach(leave => {
                const indicator = document.createElement('div');
                indicator.className = `leave-indicator ${leave.status}`;
                indicator.title = `${leave.employeeName}: ${leave.leaveType}`;
                indicator.style.backgroundColor = this.getLeaveColor(leave.leaveType, leave.status);
                dayElement.appendChild(indicator);
            });
        }
        
        // Add click handler
        dayElement.addEventListener('click', () => {
            this.selectDate(date);
        });
        
        return dayElement;
    }

    getLeavesForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.leaveData.filter(leave => {
            const startDate = leave.startDate;
            const endDate = leave.endDate;
            return dateStr >= startDate && dateStr <= endDate;
        });
    }

    getConflictsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.conflicts.filter(conflict => {
            const startDate = conflict.startDate;
            const endDate = conflict.endDate;
            return dateStr >= startDate && dateStr <= endDate;
        });
    }

    getLeaveColor(leaveType, status) {
        const colors = {
            vacation: '#22c55e',
            sick: '#f59e0b',
            personal: '#3b82f6',
            maternity: '#ec4899',
            emergency: '#ef4444'
        };
        
        let color = colors[leaveType] || '#64748b';
        
        if (status === 'pending') {
            color = '#f59e0b';
        } else if (status === 'rejected') {
            color = '#ef4444';
        }
        
        return color;
    }

    selectDate(date) {
        // Remove previous selection
        document.querySelectorAll('.calendar-day.selected').forEach(day => {
            day.classList.remove('selected');
        });
        
        // Add selection to new date
        const dayElements = document.querySelectorAll('.calendar-day');
        dayElements.forEach(dayElement => {
            const dayNumber = parseInt(dayElement.querySelector('.day-number').textContent);
            if (dayNumber === date.getDate()) {
                dayElement.classList.add('selected');
            }
        });
        
        this.selectedDate = date;
        this.showDateDetails(date);
    }

    showDateDetails(date) {
        const leaves = this.getLeavesForDate(date);
        const conflicts = this.getConflictsForDate(date);
        
        if (leaves.length === 0 && conflicts.length === 0) {
            this.showDateSummary(date, 'No scheduled leave for this date');
            return;
        }
        
        let details = `<h4>${date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}</h4>`;
        
        if (conflicts.length > 0) {
            details += '<div class="conflict-alert"><h5>⚠️ Conflicts Detected</h5>';
            conflicts.forEach(conflict => {
                details += `<p>Overlapping leave: ${conflict.leaves.map(l => l.employeeName).join(', ')}</p>`;
            });
            details += '</div>';
        }
        
        if (leaves.length > 0) {
            details += '<div class="leave-details"><h5>Scheduled Leave</h5>';
            leaves.forEach(leave => {
                details += `
                    <div class="leave-item">
                        <strong>${leave.employeeName}</strong><br>
                        ${leave.leaveType} (${leave.status})<br>
                        ${leave.startDate} to ${leave.endDate}
                        ${leave.reason ? `<br><em>${leave.reason}</em>` : ''}
                    </div>
                `;
            });
            details += '</div>';
        }
        
        this.showDateSummary(date, details);
    }

    showDateSummary(date, content) {
        // Create or update date details panel
        let detailsPanel = document.getElementById('date-details-panel');
        
        if (!detailsPanel) {
            detailsPanel = document.createElement('div');
            detailsPanel.id = 'date-details-panel';
            detailsPanel.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--background-color);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-lg);
                padding: 1.5rem;
                max-width: 400px;
                width: 90%;
                z-index: 1000;
                max-height: 80vh;
                overflow-y: auto;
            `;
            
            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.style.cssText = `
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                background: transparent;
                border: none;
                font-size: 1.25rem;
                cursor: pointer;
                color: var(--text-muted);
                padding: 0.5rem;
                border-radius: var(--radius-sm);
            `;
            closeBtn.addEventListener('click', () => {
                detailsPanel.remove();
                this.selectedDate = null;
                document.querySelectorAll('.calendar-day.selected').forEach(day => {
                    day.classList.remove('selected');
                });
            });
            
            detailsPanel.appendChild(closeBtn);
            document.body.appendChild(detailsPanel);
            
            // Add backdrop
            const backdrop = document.createElement('div');
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
            `;
            backdrop.addEventListener('click', () => closeBtn.click());
            document.body.insertBefore(backdrop, detailsPanel);
            
            // Store backdrop reference for cleanup
            detailsPanel.backdrop = backdrop;
        }
        
        // Update content
        const contentDiv = detailsPanel.querySelector('.details-content') || document.createElement('div');
        contentDiv.className = 'details-content';
        contentDiv.style.marginTop = '2rem';
        contentDiv.innerHTML = content;
        
        if (!detailsPanel.contains(contentDiv)) {
            detailsPanel.appendChild(contentDiv);
        }
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.refresh();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.refresh();
    }

    goToToday() {
        this.currentDate = new Date();
        this.refresh();
    }

    async refresh() {
        try {
            await this.loadLeaveData();
            this.renderCalendar();
        } catch (error) {
            console.error('Error refreshing calendar:', error);
        }
    }

    handleKeyboardNavigation(e) {
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.previousMonth();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextMonth();
                break;
            case 'Home':
                e.preventDefault();
                this.goToToday();
                break;
            case 'Escape':
                e.preventDefault();
                this.closeDateDetails();
                break;
        }
    }

    closeDateDetails() {
        const detailsPanel = document.getElementById('date-details-panel');
        if (detailsPanel) {
            if (detailsPanel.backdrop) {
                detailsPanel.backdrop.remove();
            }
            detailsPanel.remove();
        }
        
        this.selectedDate = null;
        document.querySelectorAll('.calendar-day.selected').forEach(day => {
            day.classList.remove('selected');
        });
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    isSameDate(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    // Public methods
    getCurrentMonth() {
        return this.currentDate.getMonth();
    }

    getCurrentYear() {
        return this.currentDate.getFullYear();
    }

    getSelectedDate() {
        return this.selectedDate;
    }

    // Method to highlight specific dates (e.g., for leave request planning)
    highlightDates(dates, className = 'highlighted') {
        dates.forEach(dateStr => {
            const date = new Date(dateStr);
            const dayElements = document.querySelectorAll('.calendar-day');
            
            dayElements.forEach(dayElement => {
                const dayNumber = parseInt(dayElement.querySelector('.day-number').textContent);
                if (dayNumber === date.getDate()) {
                    dayElement.classList.add(className);
                }
            });
        });
    }

    // Method to clear highlights
    clearHighlights(className = 'highlighted') {
        document.querySelectorAll(`.calendar-day.${className}`).forEach(day => {
            day.classList.remove(className);
        });
    }

    // Export calendar data (for HR reports)
    exportCalendarData() {
        if (this.userRole !== 'hr') return null;
        
        const monthData = {
            month: this.currentDate.getMonth() + 1,
            year: this.currentDate.getFullYear(),
            leaves: this.leaveData,
            conflicts: this.conflicts,
            summary: {
                totalLeaves: this.leaveData.length,
                approvedLeaves: this.leaveData.filter(l => l.status === 'approved').length,
                pendingLeaves: this.leaveData.filter(l => l.status === 'pending').length,
                totalConflicts: this.conflicts.length
            }
        };
        
        return monthData;
    }

    cleanup() {
        // Close any open date details
        this.closeDateDetails();
        
        // Clear data
        this.leaveData = [];
        this.conflicts = [];
        this.selectedDate = null;
    }
}

// Initialize calendar manager
let calendarManager;
document.addEventListener('DOMContentLoaded', () => {
    calendarManager = new CalendarManager();
    window.calendarManager = calendarManager;
});

// Add calendar-specific styles
const calendarStyles = `
.calendar-day.selected {
    background: var(--primary-light) !important;
    border: 2px solid var(--primary-color) !important;
}

.calendar-day.highlighted {
    box-shadow: inset 0 0 0 2px var(--warning-color);
}

.conflict-alert {
    background: var(--error-color);
    color: white;
    padding: 0.75rem;
    border-radius: var(--radius-md);
    margin-bottom: 1rem;
}

.conflict-alert h5 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
}

.leave-details {
    background: var(--surface-color);
    padding: 0.75rem;
    border-radius: var(--radius-md);
}

.leave-details h5 {
    margin: 0 0 0.75rem 0;
    color: var(--text-primary);
    font-size: 0.875rem;
}

.leave-item {
    background: var(--background-color);
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.4;
}

.leave-item:last-child {
    margin-bottom: 0;
}

.calendar-header-day {
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

@media (max-width: 768px) {
    .calendar-day {
        min-height: 60px;
        font-size: 0.875rem;
    }
    
    .leave-indicator {
        height: 3px;
    }
    
    #date-details-panel {
        width: 95% !important;
        max-height: 70vh !important;
    }
}
`;

// Inject calendar styles
const calendarStyleSheet = document.createElement('style');
calendarStyleSheet.textContent = calendarStyles;
document.head.appendChild(calendarStyleSheet);
