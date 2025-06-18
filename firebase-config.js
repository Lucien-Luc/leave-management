// Firebase configuration and initialization
// This file handles Firebase setup, authentication, and Firestore operations

// Firebase configuration using environment variables for security
const firebaseConfig = {
    apiKey: window.FIREBASE_API_KEY || "AIzaSyAqxMS295v7XBtFrwZKtrEgb_b_hxzy77Q",
    authDomain: window.FIREBASE_AUTH_DOMAIN || "mydb-47035.firebaseapp.com",
    projectId: window.FIREBASE_PROJECT_ID || "mydb-47035",
    storageBucket: window.FIREBASE_STORAGE_BUCKET || "mydb-47035.firebasestorage.app",
    messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || "816767003162",
    appId: window.FIREBASE_APP_ID || "1:816767003162:web:8530107cd5baadc9167fa3",
    measurementId: "G-QRH3R4MTEC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Authentication state management
let currentUser = null;
let userRole = null;

// Production user roles and restrictions
const USER_ROLES = {
    HR: 'hr',
    EMPLOYEE: 'employee'
};

// Company domain for automatic approval
const COMPANY_DOMAIN = '@bpn.rw';

// Microsoft Outlook authentication functions
async function signInWithMicrosoftOutlook() {
    try {
        const provider = new firebase.auth.OAuthProvider('microsoft.com');
        provider.setCustomParameters({
            tenant: 'common',
            prompt: 'select_account'
        });
        
        // Add specific scopes for Outlook/Office 365
        provider.addScope('https://graph.microsoft.com/User.Read');
        provider.addScope('https://graph.microsoft.com/Mail.Read');
        
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Get additional user info from Microsoft Graph
        const credential = firebase.auth.OAuthProvider.credentialFromResult(result);
        const accessToken = credential.accessToken;
        
        // Store Microsoft access token for future Graph API calls
        if (accessToken) {
            localStorage.setItem('msft_access_token', accessToken);
        }
        
        // Check if user exists in our system
        let userData = await firestoreService.getUser(user.uid);
        
        if (!userData) {
            // Create new user profile - determine role based on email domain
            const isCompanyEmail = user.email.endsWith(COMPANY_DOMAIN);
            const defaultRole = isCompanyEmail ? USER_ROLES.EMPLOYEE : USER_ROLES.EMPLOYEE;
            const status = isCompanyEmail ? 'approved' : 'pending';
            
            await createUserProfile(user, defaultRole, status, 'microsoft');
            userData = await firestoreService.getUser(user.uid);
        }
        
        return { user, userData };
    } catch (error) {
        console.error('Microsoft sign-in error:', error);
        throw error;
    }
}

// Legacy function for backward compatibility
function signInWithMicrosoft() {
    return signInWithMicrosoftOutlook();
}

async function signUpAsHR(email, password, displayName) {
    // Check if HR already exists
    const existingHR = await checkExistingHR();
    if (existingHR) {
        throw new Error('HR account already exists. Only one HR account is allowed.');
    }
    
    // Create user with email/password
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Update profile
    await user.updateProfile({ displayName });
    
    // Create HR user profile
    await createUserProfile(user, USER_ROLES.HR);
    
    return user;
}

async function signInAsHR(email, password) {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Verify user is HR
    const userData = await firestoreService.getUser(user.uid);
    if (!userData || userData.role !== USER_ROLES.HR) {
        await auth.signOut();
        throw new Error('Access denied. This account is not authorized as HR.');
    }
    
    return user;
}

async function signUpAsEmployee(email, password, displayName) {
    // Create user with email/password
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Update profile
    await user.updateProfile({ displayName });
    
    // Determine approval status
    const isAutoApproved = email.endsWith(COMPANY_DOMAIN);
    const status = isAutoApproved ? 'approved' : 'pending';
    
    // Create employee user profile
    await createUserProfile(user, USER_ROLES.EMPLOYEE, status);
    
    return { user, isAutoApproved };
}

async function signInAsEmployee(email, password) {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Check user status
    const userData = await firestoreService.getUser(user.uid);
    if (!userData) {
        await auth.signOut();
        throw new Error('User profile not found.');
    }
    
    if (userData.role !== USER_ROLES.EMPLOYEE) {
        await auth.signOut();
        throw new Error('Access denied. Please use HR login.');
    }
    
    if (userData.status === 'pending') {
        await auth.signOut();
        throw new Error('Your account is pending HR approval.');
    }
    
    if (userData.status === 'rejected') {
        await auth.signOut();
        throw new Error('Your account has been rejected. Please contact HR.');
    }
    
    return user;
}

function signOut() {
    currentUser = null;
    userRole = null;
    return auth.signOut();
}

// Helper functions
async function checkExistingHR() {
    const users = await firestoreService.getAllUsers();
    return users.find(user => user.role === USER_ROLES.HR);
}

async function createUserProfile(user, role, status = 'approved', provider = 'email') {
    const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: role,
        status: status,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    };

    await firestoreService.createUser(userData);
    
    // Initialize leave balance for employees
    if (role === USER_ROLES.EMPLOYEE && status === 'approved') {
        await firestoreService.createLeaveBalance(user.uid, {
            vacation: 25,
            sick: 10,
            personal: 5,
            maternity: 90,
            emergency: 3
        });
    }
    
    return userData;
}

function getCurrentUser() {
    return auth.currentUser;
}

async function getCurrentUserRole() {
    const user = getCurrentUser();
    if (!user) return null;
    
    try {
        const userData = await firestoreService.getUser(user.uid);
        return userData ? userData.role : null;
    } catch (error) {
        console.error('Error fetching user role:', error);
        return null;
    }
}

// Firestore operations
class FirestoreService {
    constructor() {
        this.collections = {
            users: 'users',
            leaveRequests: 'leaveRequests',
            leaveBalances: 'leaveBalances',
            notifications: 'notifications',
            settings: 'settings'
        };
    }

    // User operations
    async createUser(userData) {
        try {
            const userDoc = {
                ...userData,
                department: userData.department || 'General',
                manager: userData.manager || null,
                joinDate: userData.joinDate || firebase.firestore.FieldValue.serverTimestamp(),
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection(this.collections.users).doc(userData.uid).set(userDoc);
            
            // Create initial leave balance only for approved employees
            if (userData.role === 'employee' && userData.status === 'approved') {
                await this.createLeaveBalance(userData.uid, {
                    userId: userData.uid,
                    vacation: 25,
                    sick: 10,
                    personal: 5,
                    maternity: 90,
                    emergency: 3,
                    used: {
                        vacation: 0,
                        sick: 0,
                        personal: 0,
                        maternity: 0,
                        emergency: 0
                    }
                });
            }
            
            // Notify HR about new employee registration (but not for HR account creation)
            if (userData.role === 'employee' && userData.status === 'pending') {
                const hrUser = await this.getHRUser();
                if (hrUser) {
                    await this.createNotification({
                        userId: hrUser.uid,
                        title: 'New Employee Registration',
                        message: `${userData.displayName || userData.email} has registered and is pending approval.`,
                        type: 'user_registration',
                        relatedUserId: userData.uid,
                        priority: 'medium'
                    });
                }
            }
            
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async getUser(uid) {
        try {
            const doc = await db.collection(this.collections.users).doc(uid).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    async updateUser(uid, userData) {
        try {
            await db.collection(this.collections.users).doc(uid).update({
                ...userData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async getAllUsers() {
        try {
            const snapshot = await db.collection(this.collections.users).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    }

    async getPendingUsers() {
        try {
            const snapshot = await db.collection(this.collections.users)
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting pending users:', error);
            throw error;
        }
    }

    async approveUser(uid) {
        try {
            await this.updateUser(uid, { 
                status: 'approved',
                approvedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Create notification for the user
            const user = await this.getUser(uid);
            if (user) {
                await this.createNotification({
                    userId: uid,
                    title: 'Account Approved',
                    message: 'Your account has been approved by HR. You can now access all leave management features.',
                    type: 'account_approval',
                    priority: 'high'
                });
            }
        } catch (error) {
            console.error('Error approving user:', error);
            throw error;
        }
    }

    async rejectUser(uid, reason = '') {
        try {
            await this.updateUser(uid, { 
                status: 'rejected',
                rejectionReason: reason,
                rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Create notification for the user
            const user = await this.getUser(uid);
            if (user) {
                await this.createNotification({
                    userId: uid,
                    title: 'Account Not Approved',
                    message: `Your account registration was not approved. ${reason ? 'Reason: ' + reason : 'Please contact HR for more information.'}`,
                    type: 'account_rejection',
                    priority: 'high'
                });
            }
        } catch (error) {
            console.error('Error rejecting user:', error);
            throw error;
        }
    }

    // Leave request operations
    async createLeaveRequest(requestData) {
        try {
            const docRef = await db.collection(this.collections.leaveRequests).add({
                ...requestData,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating leave request:', error);
            throw error;
        }
    }

    async getLeaveRequests(filters = {}) {
        try {
            let query = db.collection(this.collections.leaveRequests);
            
            // Apply filters
            if (filters.userId) {
                query = query.where('userId', '==', filters.userId);
            }
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            if (filters.startDate) {
                query = query.where('startDate', '>=', filters.startDate);
            }
            if (filters.endDate) {
                query = query.where('startDate', '<=', filters.endDate);
            }

            query = query.orderBy('createdAt', 'desc');
            
            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting leave requests:', error);
            throw error;
        }
    }

    async updateLeaveRequest(requestId, updateData) {
        try {
            await db.collection(this.collections.leaveRequests).doc(requestId).update({
                ...updateData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating leave request:', error);
            throw error;
        }
    }

    async deleteLeaveRequest(requestId) {
        try {
            await db.collection(this.collections.leaveRequests).doc(requestId).delete();
        } catch (error) {
            console.error('Error deleting leave request:', error);
            throw error;
        }
    }

    // Leave balance operations
    async getLeaveBalance(userId) {
        try {
            const doc = await db.collection(this.collections.leaveBalances).doc(userId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            } else {
                // Return default balance if none exists
                const defaultBalance = {
                    userId: userId,
                    vacation: 25,
                    sick: 10,
                    personal: 5,
                    maternity: 90,
                    emergency: 3,
                    used: {
                        vacation: 0,
                        sick: 0,
                        personal: 0,
                        maternity: 0,
                        emergency: 0
                    }
                };
                await this.createLeaveBalance(userId, defaultBalance);
                return defaultBalance;
            }
        } catch (error) {
            console.error('Error getting leave balance:', error);
            throw error;
        }
    }

    async createLeaveBalance(userId, balanceData) {
        try {
            await db.collection(this.collections.leaveBalances).doc(userId).set({
                ...balanceData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error creating leave balance:', error);
            throw error;
        }
    }

    async updateLeaveBalance(userId, balanceData) {
        try {
            await db.collection(this.collections.leaveBalances).doc(userId).update({
                ...balanceData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating leave balance:', error);
            throw error;
        }
    }

    // Notification operations
    async createNotification(notificationData) {
        try {
            await db.collection(this.collections.notifications).add({
                ...notificationData,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    async getNotifications(userId) {
        try {
            const snapshot = await db.collection(this.collections.notifications)
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting notifications:', error);
            throw error;
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            await db.collection(this.collections.notifications).doc(notificationId).update({
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    async markAllNotificationsAsRead(userId) {
        try {
            const batch = db.batch();
            const snapshot = await db.collection(this.collections.notifications)
                .where('userId', '==', userId)
                .where('read', '==', false)
                .get();
            
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    read: true,
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    // Real-time listeners
    onLeaveRequestsChange(callback, filters = {}) {
        let query = db.collection(this.collections.leaveRequests);
        
        if (filters.userId) {
            query = query.where('userId', '==', filters.userId);
        }
        
        query = query.orderBy('createdAt', 'desc');
        
        return query.onSnapshot(snapshot => {
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(requests);
        });
    }

    onNotificationsChange(userId, callback) {
        return db.collection(this.collections.notifications)
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .onSnapshot(snapshot => {
                const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(notifications);
            });
    }

    // HR-specific functions
    async getHRUser() {
        try {
            const snapshot = await db.collection(this.collections.users)
                .where('role', '==', 'hr')
                .limit(1)
                .get();
            return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        } catch (error) {
            console.error('Error getting HR user:', error);
            return null;
        }
    }

    async createEmployeeByHR(employeeData) {
        try {
            const userData = {
                uid: this.generateUserId(),
                email: employeeData.email,
                displayName: employeeData.displayName,
                role: USER_ROLES.EMPLOYEE,
                status: 'approved',
                department: employeeData.department || 'General',
                position: employeeData.position || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: 'hr'
            };
            
            await this.createUser(userData);
            
            return userData;
        } catch (error) {
            console.error('Error creating employee:', error);
            throw error;
        }
    }

    async deleteEmployee(uid) {
        try {
            await this.updateUser(uid, { 
                isActive: false,
                deletedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const pendingRequests = await this.getLeaveRequests({ 
                userId: uid, 
                status: 'pending' 
            });
            
            for (const request of pendingRequests) {
                await this.updateLeaveRequest(request.id, { 
                    status: 'cancelled',
                    cancelReason: 'Employee account deactivated'
                });
            }
        } catch (error) {
            console.error('Error deleting employee:', error);
            throw error;
        }
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Create global instance
const firestoreService = new FirestoreService();

// Auth state observer
auth.onAuthStateChanged((user) => {
    if (user && !currentUser) {
        currentUser = user;
        // Determine user role from Firestore or claims
        firestoreService.getUser(user.uid).then(userData => {
            if (userData) {
                userRole = userData.role || 'employee';
            }
        });
    }
});

// Export for use in other modules
window.FirebaseConfig = {
    auth,
    db,
    firestoreService,
    signInWithMicrosoft,
    signUpAsHR,
    signInAsHR,
    signUpAsEmployee,
    signInAsEmployee,
    signOut,
    getCurrentUser,
    getCurrentUserRole,
    checkExistingHR,
    createUserProfile,
    USER_ROLES,
    COMPANY_DOMAIN
};
