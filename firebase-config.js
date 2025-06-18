// Firebase configuration and initialization
// This file handles Firebase setup, authentication, and Firestore operations

// Firebase configuration with your provided keys
const firebaseConfig = {
    apiKey: "AIzaSyAqxMS295v7XBtFrwZKtrEgb_b_hxzy77Q",
    authDomain: "mydb-47035.firebaseapp.com",
    projectId: "mydb-47035",
    storageBucket: "mydb-47035.firebasestorage.app",
    messagingSenderId: "816767003162",
    appId: "1:816767003162:web:8530107cd5baadc9167fa3",
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

// Demo users for testing (in production, this would be handled by proper authentication)
const demoUsers = {
    hr: {
        uid: 'hr-demo-user',
        email: 'hr@company.com',
        displayName: 'HR Manager',
        photoURL: 'https://via.placeholder.com/150',
        role: 'hr'
    },
    employee: {
        uid: 'employee-demo-user',
        email: 'employee@company.com',
        displayName: 'John Doe',
        photoURL: 'https://via.placeholder.com/150',
        role: 'employee'
    }
};

// Authentication functions
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider);
}

function signInWithDemo(role) {
    return new Promise((resolve) => {
        const user = demoUsers[role];
        currentUser = user;
        userRole = role;
        
        // Store user data in localStorage for persistence
        localStorage.setItem('demoUser', JSON.stringify(user));
        
        resolve(user);
    });
}

function signOut() {
    currentUser = null;
    userRole = null;
    localStorage.removeItem('demoUser');
    return auth.signOut();
}

function getCurrentUser() {
    // Check if demo user exists in localStorage
    const demoUser = localStorage.getItem('demoUser');
    if (demoUser) {
        const user = JSON.parse(demoUser);
        currentUser = user;
        userRole = user.role;
        return user;
    }
    
    return auth.currentUser;
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
                status: 'pending', // New users start as pending until HR approval
                role: userData.role || 'employee', // Default to employee
                department: userData.department || 'General',
                manager: userData.manager || null,
                joinDate: userData.joinDate || firebase.firestore.FieldValue.serverTimestamp(),
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection(this.collections.users).doc(userData.uid).set(userDoc);
            
            // Create initial leave balance for new user
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
            
            // Notify HR about new user registration
            await this.createNotification({
                userId: 'hr-notifications', // Special collection for HR notifications
                title: 'New Employee Registration',
                message: `${userData.displayName || userData.email} has registered and is pending approval.`,
                type: 'user_registration',
                relatedUserId: userData.uid,
                priority: 'medium'
            });
            
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
    signInWithGoogle,
    signInWithDemo,
    signOut,
    getCurrentUser,
    currentUser,
    userRole,
    demoUsers
};
