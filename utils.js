// Utility functions for the HR Leave Management System
// Provides common helper functions for date formatting, validation, and other operations

window.utils = {
    
    // Date and time utilities
    date: {
        /**
         * Format a date string to a readable format
         * @param {string|Date} date - Date to format
         * @param {string} format - Format type ('short', 'long', 'numeric')
         * @returns {string} Formatted date string
         */
        format(date, format = 'short') {
            if (!date) return '';
            
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            
            const options = {
                short: { year: 'numeric', month: 'short', day: 'numeric' },
                long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
                numeric: { year: 'numeric', month: '2-digit', day: '2-digit' }
            };
            
            return d.toLocaleDateString('en-US', options[format] || options.short);
        },

        /**
         * Format a date with time
         * @param {string|Date} date - Date to format
         * @returns {string} Formatted date and time string
         */
        formatDateTime(date) {
            if (!date) return '';
            
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            
            return d.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        /**
         * Get time ago string (e.g., "2 hours ago")
         * @param {string|Date} date - Date to compare
         * @returns {string} Time ago string
         */
        timeAgo(date) {
            if (!date) return '';
            
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            
            const now = new Date();
            const diffInSeconds = Math.floor((now - d) / 1000);
            
            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
            if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
            return `${Math.floor(diffInSeconds / 31536000)}y ago`;
        },

        /**
         * Calculate the number of business days between two dates
         * @param {string|Date} startDate - Start date
         * @param {string|Date} endDate - End date
         * @returns {number} Number of business days
         */
        businessDaysBetween(startDate, endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
            
            let count = 0;
            const current = new Date(start);
            
            while (current <= end) {
                const dayOfWeek = current.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
                    count++;
                }
                current.setDate(current.getDate() + 1);
            }
            
            return count;
        },

        /**
         * Calculate total days between two dates (inclusive)
         * @param {string|Date} startDate - Start date
         * @param {string|Date} endDate - End date
         * @returns {number} Number of days
         */
        daysBetween(startDate, endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
            
            const diffTime = Math.abs(end - start);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        },

        /**
         * Check if a date is a weekend
         * @param {string|Date} date - Date to check
         * @returns {boolean} True if weekend
         */
        isWeekend(date) {
            const d = new Date(date);
            if (isNaN(d.getTime())) return false;
            
            const dayOfWeek = d.getDay();
            return dayOfWeek === 0 || dayOfWeek === 6;
        },

        /**
         * Get the start and end of a month
         * @param {number} year - Year
         * @param {number} month - Month (0-11)
         * @returns {object} Object with start and end dates
         */
        getMonthRange(year, month) {
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0);
            
            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0]
            };
        },

        /**
         * Get today's date in ISO format
         * @returns {string} Today's date in YYYY-MM-DD format
         */
        today() {
            return new Date().toISOString().split('T')[0];
        },

        /**
         * Add days to a date
         * @param {string|Date} date - Base date
         * @param {number} days - Number of days to add
         * @returns {string} New date in ISO format
         */
        addDays(date, days) {
            const d = new Date(date);
            d.setDate(d.getDate() + days);
            return d.toISOString().split('T')[0];
        }
    },

    // Validation utilities
    validation: {
        /**
         * Validate email address
         * @param {string} email - Email to validate
         * @returns {boolean} True if valid
         */
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        /**
         * Validate date string
         * @param {string} date - Date string to validate
         * @returns {boolean} True if valid
         */
        isValidDate(date) {
            const d = new Date(date);
            return !isNaN(d.getTime());
        },

        /**
         * Check if a date is in the future
         * @param {string|Date} date - Date to check
         * @returns {boolean} True if in future
         */
        isFutureDate(date) {
            const d = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return d > today;
        },

        /**
         * Validate date range
         * @param {string} startDate - Start date
         * @param {string} endDate - End date
         * @returns {object} Validation result
         */
        validateDateRange(startDate, endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime())) {
                return { valid: false, message: 'Invalid start date' };
            }
            
            if (isNaN(end.getTime())) {
                return { valid: false, message: 'Invalid end date' };
            }
            
            if (start > end) {
                return { valid: false, message: 'End date must be after start date' };
            }
            
            return { valid: true };
        },

        /**
         * Validate leave request data
         * @param {object} requestData - Leave request data
         * @returns {object} Validation result
         */
        validateLeaveRequest(requestData) {
            const { leaveType, startDate, endDate, reason } = requestData;
            
            // Required fields
            if (!leaveType) {
                return { valid: false, message: 'Leave type is required' };
            }
            
            if (!startDate) {
                return { valid: false, message: 'Start date is required' };
            }
            
            if (!endDate) {
                return { valid: false, message: 'End date is required' };
            }
            
            // Date validation
            const dateValidation = this.validateDateRange(startDate, endDate);
            if (!dateValidation.valid) {
                return dateValidation;
            }
            
            // Future date validation
            if (!this.isFutureDate(startDate)) {
                return { valid: false, message: 'Start date must be in the future' };
            }
            
            // Reason validation for certain leave types
            if (['sick', 'emergency'].includes(leaveType) && !reason?.trim()) {
                return { valid: false, message: `Reason is required for ${leaveType} leave` };
            }
            
            return { valid: true };
        }
    },

    // String utilities
    string: {
        /**
         * Capitalize first letter of each word
         * @param {string} str - String to capitalize
         * @returns {string} Capitalized string
         */
        capitalize(str) {
            if (!str) return '';
            return str.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        },

        /**
         * Truncate string to specified length
         * @param {string} str - String to truncate
         * @param {number} length - Maximum length
         * @returns {string} Truncated string
         */
        truncate(str, length = 50) {
            if (!str) return '';
            return str.length > length ? str.substring(0, length) + '...' : str;
        },

        /**
         * Generate a random ID
         * @param {number} length - Length of ID
         * @returns {string} Random ID
         */
        generateId(length = 8) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },

        /**
         * Format leave type for display
         * @param {string} leaveType - Leave type
         * @returns {string} Formatted leave type
         */
        formatLeaveType(leaveType) {
            const types = {
                vacation: 'Vacation',
                sick: 'Sick Leave',
                personal: 'Personal',
                maternity: 'Maternity/Paternity',
                emergency: 'Emergency'
            };
            return types[leaveType] || this.capitalize(leaveType);
        },

        /**
         * Format status for display
         * @param {string} status - Status
         * @returns {string} Formatted status
         */
        formatStatus(status) {
            return this.capitalize(status);
        }
    },

    // Array utilities
    array: {
        /**
         * Group array by key
         * @param {Array} array - Array to group
         * @param {string} key - Key to group by
         * @returns {object} Grouped object
         */
        groupBy(array, key) {
            return array.reduce((groups, item) => {
                const value = item[key];
                if (!groups[value]) {
                    groups[value] = [];
                }
                groups[value].push(item);
                return groups;
            }, {});
        },

        /**
         * Sort array by date
         * @param {Array} array - Array to sort
         * @param {string} dateKey - Date key to sort by
         * @param {string} order - Sort order ('asc' or 'desc')
         * @returns {Array} Sorted array
         */
        sortByDate(array, dateKey, order = 'desc') {
            return array.sort((a, b) => {
                const dateA = new Date(a[dateKey]);
                const dateB = new Date(b[dateKey]);
                
                if (order === 'asc') {
                    return dateA - dateB;
                } else {
                    return dateB - dateA;
                }
            });
        },

        /**
         * Filter array by date range
         * @param {Array} array - Array to filter
         * @param {string} dateKey - Date key to filter by
         * @param {string} startDate - Start date
         * @param {string} endDate - End date
         * @returns {Array} Filtered array
         */
        filterByDateRange(array, dateKey, startDate, endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            return array.filter(item => {
                const itemDate = new Date(item[dateKey]);
                return itemDate >= start && itemDate <= end;
            });
        },

        /**
         * Get unique values from array
         * @param {Array} array - Array to process
         * @param {string} key - Key to get unique values for
         * @returns {Array} Array of unique values
         */
        unique(array, key) {
            if (key) {
                return [...new Set(array.map(item => item[key]))];
            }
            return [...new Set(array)];
        }
    },

    // Local storage utilities
    storage: {
        /**
         * Set item in localStorage with expiration
         * @param {string} key - Storage key
         * @param {any} value - Value to store
         * @param {number} ttl - Time to live in milliseconds
         */
        setItem(key, value, ttl = null) {
            const item = {
                value: value,
                timestamp: Date.now(),
                ttl: ttl
            };
            localStorage.setItem(key, JSON.stringify(item));
        },

        /**
         * Get item from localStorage
         * @param {string} key - Storage key
         * @returns {any} Stored value or null
         */
        getItem(key) {
            try {
                const item = localStorage.getItem(key);
                if (!item) return null;
                
                const parsed = JSON.parse(item);
                
                // Check if item has expired
                if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
                    localStorage.removeItem(key);
                    return null;
                }
                
                return parsed.value;
            } catch (error) {
                console.error('Error getting item from localStorage:', error);
                return null;
            }
        },

        /**
         * Remove item from localStorage
         * @param {string} key - Storage key
         */
        removeItem(key) {
            localStorage.removeItem(key);
        },

        /**
         * Clear all items from localStorage
         */
        clear() {
            localStorage.clear();
        }
    },

    // Number utilities
    number: {
        /**
         * Format number with commas
         * @param {number} num - Number to format
         * @returns {string} Formatted number
         */
        formatWithCommas(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },

        /**
         * Round number to specified decimal places
         * @param {number} num - Number to round
         * @param {number} decimals - Number of decimal places
         * @returns {number} Rounded number
         */
        round(num, decimals = 2) {
            return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
        },

        /**
         * Clamp number between min and max
         * @param {number} num - Number to clamp
         * @param {number} min - Minimum value
         * @param {number} max - Maximum value
         * @returns {number} Clamped number
         */
        clamp(num, min, max) {
            return Math.min(Math.max(num, min), max);
        }
    },

    // URL utilities
    url: {
        /**
         * Get query parameters from URL
         * @param {string} url - URL to parse (optional, defaults to current URL)
         * @returns {object} Query parameters object
         */
        getQueryParams(url = window.location.href) {
            const params = {};
            const urlObj = new URL(url);
            
            for (const [key, value] of urlObj.searchParams) {
                params[key] = value;
            }
            
            return params;
        },

        /**
         * Build query string from object
         * @param {object} params - Parameters object
         * @returns {string} Query string
         */
        buildQueryString(params) {
            return Object.keys(params)
                .filter(key => params[key] !== null && params[key] !== undefined)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join('&');
        }
    },

    // Color utilities
    color: {
        /**
         * Get color for leave status
         * @param {string} status - Leave status
         * @returns {string} Color hex code
         */
        getStatusColor(status) {
            const colors = {
                pending: '#f59e0b',
                approved: '#22c55e',
                rejected: '#ef4444',
                cancelled: '#64748b'
            };
            return colors[status] || '#64748b';
        },

        /**
         * Get color for leave type
         * @param {string} leaveType - Leave type
         * @returns {string} Color hex code
         */
        getLeaveTypeColor(leaveType) {
            const colors = {
                vacation: '#22c55e',
                sick: '#f59e0b',
                personal: '#3b82f6',
                maternity: '#ec4899',
                emergency: '#ef4444'
            };
            return colors[leaveType] || '#64748b';
        },

        /**
         * Generate a random color
         * @returns {string} Random color hex code
         */
        randomColor() {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
    },

    // Export utilities
    export: {
        /**
         * Export data to CSV
         * @param {Array} data - Data to export
         * @param {string} filename - File name
         * @param {Array} headers - Column headers
         */
        toCSV(data, filename, headers = null) {
            let csvContent = '';
            
            // Add headers if provided
            if (headers) {
                csvContent += headers.join(',') + '\n';
            } else if (data.length > 0) {
                csvContent += Object.keys(data[0]).join(',') + '\n';
            }
            
            // Add data rows
            data.forEach(row => {
                const values = Object.values(row).map(value => {
                    // Escape commas and quotes in values
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                });
                csvContent += values.join(',') + '\n';
            });
            
            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        /**
         * Export data to JSON
         * @param {any} data - Data to export
         * @param {string} filename - File name
         */
        toJSON(data, filename) {
            const jsonContent = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}.json`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },

    // Browser utilities
    browser: {
        /**
         * Check if browser supports a feature
         * @param {string} feature - Feature to check
         * @returns {boolean} True if supported
         */
        supports(feature) {
            switch (feature) {
                case 'localStorage':
                    return typeof Storage !== 'undefined';
                case 'notifications':
                    return 'Notification' in window;
                case 'geolocation':
                    return 'geolocation' in navigator;
                case 'webWorkers':
                    return typeof Worker !== 'undefined';
                default:
                    return false;
            }
        },

        /**
         * Get browser information
         * @returns {object} Browser info
         */
        getInfo() {
            const ua = navigator.userAgent;
            const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
            const isFirefox = /Firefox/.test(ua);
            const isSafari = /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor);
            const isEdge = /Edge/.test(ua);
            
            return {
                isChrome,
                isFirefox,
                isSafari,
                isEdge,
                isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
                isTouch: 'ontouchstart' in window
            };
        }
    },

    // Debounce and throttle utilities
    performance: {
        /**
         * Debounce function calls
         * @param {Function} func - Function to debounce
         * @param {number} wait - Wait time in milliseconds
         * @returns {Function} Debounced function
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle function calls
         * @param {Function} func - Function to throttle
         * @param {number} limit - Time limit in milliseconds
         * @returns {Function} Throttled function
         */
        throttle(func, limit) {
            let inThrottle;
            return function executedFunction(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    }
};

// Convenience aliases
window.utils.formatDate = window.utils.date.format;
window.utils.formatDateTime = window.utils.date.formatDateTime;
window.utils.formatTimeAgo = window.utils.date.timeAgo;
window.utils.calculateDays = window.utils.date.daysBetween;
window.utils.validateEmail = window.utils.validation.isValidEmail;
window.utils.capitalize = window.utils.string.capitalize;
window.utils.truncate = window.utils.string.truncate;

// Make utils available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.utils;
}
