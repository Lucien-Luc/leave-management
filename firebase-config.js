// Firebase configuration and initialization
// This file handles Firebase setup, authentication, and Firestore operations

// Firebase configuration - these values should be provided as environment variables
const firebaseConfig = {
    apiKey: "demo-api-key", // Will be replaced with actual key from environment
    authDomain: "demo-project.firebaseapp.com", // Will be replaced with actual domain
    projectId: "demo-project", // Will be replaced with actual project ID
    storageBucket: "demo-project.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "demo-app-id" // Will be replaced with actual app ID
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
            await db.collection(this.collections.users).doc(userData.uid).set({
                ...userData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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
