// Microsoft Outlook authentication handlers
// These functions handle sign-in with Microsoft Outlook for both HR and Employee roles

// HR Sign-in with Microsoft
async function signInHRWithMicrosoft() {
    try {
        showLoading('Signing in with Microsoft...');
        
        const result = await signInWithMicrosoftOutlook();
        const { user, userData } = result;
        
        // Check if user is authorized as HR
        if (userData.role !== 'hr') {
            await firebase.auth().signOut();
            hideLoading();
            showNotification('Access denied. This account is not authorized as HR.', 'error');
            return;
        }
        
        // Successful HR login
        currentUser = user;
        userRole = userData.role;
        
        hideLoading();
        showNotification(`Welcome back, ${user.displayName || user.email}!`, 'success');
        
        // Close modal and show main app
        document.getElementById('hr-login-modal').classList.add('hidden');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        
        // Initialize HR dashboard
        initializeApp();
        
    } catch (error) {
        console.error('HR Microsoft sign-in error:', error);
        hideLoading();
        
        let errorMessage = 'Failed to sign in with Microsoft. Please try again.';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Sign-in was cancelled. Please try again.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Pop-up blocked. Please allow pop-ups and try again.';
        }
        
        showNotification(errorMessage, 'error');
    }
}

// Employee Sign-in with Microsoft
async function signInEmployeeWithMicrosoft() {
    try {
        showLoading('Signing in with Microsoft...');
        
        const result = await signInWithMicrosoftOutlook();
        const { user, userData } = result;
        
        // Check if employee account is approved
        if (userData.status === 'pending') {
            await firebase.auth().signOut();
            hideLoading();
            showNotification('Your account is pending approval. Please contact HR.', 'warning');
            return;
        }
        
        if (userData.status === 'rejected') {
            await firebase.auth().signOut();
            hideLoading();
            showNotification('Your account has been rejected. Please contact HR.', 'error');
            return;
        }
        
        // Successful employee login
        currentUser = user;
        userRole = userData.role;
        
        hideLoading();
        showNotification(`Welcome back, ${user.displayName || user.email}!`, 'success');
        
        // Close modal and show main app
        document.getElementById('employee-login-modal').classList.add('hidden');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        
        // Initialize employee dashboard
        initializeApp();
        
    } catch (error) {
        console.error('Employee Microsoft sign-in error:', error);
        hideLoading();
        
        let errorMessage = 'Failed to sign in with Microsoft. Please try again.';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Sign-in was cancelled. Please try again.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Pop-up blocked. Please allow pop-ups and try again.';
        }
        
        showNotification(errorMessage, 'error');
    }
}

// Helper function to get Microsoft Graph user profile
async function getMicrosoftUserProfile(accessToken) {
    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching Microsoft user profile:', error);
        return null;
    }
}

// Helper function to check if user has Outlook/Office 365 access
async function checkMicrosoftOfficeAccess(accessToken) {
    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/mailboxSettings', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error('Error checking Office access:', error);
        return false;
    }
}