// Global variables
let currentUser = null;
let currentUserData = null;
let currentCurrency = 'GBP';
let currencySymbol = '£';

// Check Firebase Ready Status
function checkFirebaseReady() {
    if (!window.auth || !window.db || !window.fb) {
        console.warn('⚠️ Firebase not ready yet');
        return false;
    }
    console.log('✅ Firebase is ready!');
    return true;
}

// Wait for Firebase to load with retry mechanism
let retryCount = 0;
const maxRetries = 15;

function waitForFirebase() {
    if (checkFirebaseReady()) {
        console.log('🚀 Initializing Customer Portal...');
        window.firebaseReady = true;
        initAuth();
    } else if (retryCount < maxRetries) {
        retryCount++;
        console.log(`⏳ Waiting for Firebase... Attempt ${retryCount}/${maxRetries}`);
        setTimeout(waitForFirebase, 500);
    } else {
        console.error('❌ Firebase failed to load');
        alert('System failed to load. Please refresh the page.');
    }
}

// Start waiting for Firebase
setTimeout(waitForFirebase, 1000);

function initAuth() {
    try {
        window.fb.onAuthStateChanged(window.auth, async (user) => {
            if (user) {
                console.log('✅ User logged in:', user.email);
                currentUser = user.uid;
                await loadUserData(user.uid);
                showScreen('dashboardScreen');
                loadDashboard();
            } else {
                console.log('❌ No user logged in');
                currentUser = null;
                currentUserData = null;
            }
        });
    } catch (error) {
        console.error('Auth initialization error:', error);
    }
}

// Helper Functions
function generateAccountNumber() {
    const sortCode = '20-00-00';
    const accountNum = Math.floor(10000000 + Math.random() * 90000000);
    return `${sortCode}-${accountNum}`;
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function changeCurrency(currency) {
    currentCurrency = currency;
    currencySymbol = currency === 'GBP' ? '£' : '$';
    
    document.querySelectorAll('.currency-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) event.target.classList.add('active');
    
    if (currentUserData) {
        loadDashboard();
    }
}

function formatAmount(amount) {
    return `${currencySymbol}${amount.toFixed(2)}`;
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    const errorId = modalId.replace('Modal', 'Error');
    const errorEl = document.getElementById(errorId);
    if (errorEl) errorEl.innerHTML = '';
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = `<div class="error">${message}</div>`;
}

function showSuccess(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = `<div class="success">${message}</div>`;
}

function showLoading(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = `<div class="loading">${message}</div>`;
}

function switchTab(tab) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const tabContent = document.getElementById(tab + 'Tab');
    if (tabContent) tabContent.classList.add('active');
    
    if (tab === 'transactions') loadAllTransactions();
    if (tab === 'profile') loadProfile();
}

// Registration - COMPLETE FIXED VERSION
async function register() {
    // CRITICAL: Check if Firebase is ready first
    if (!checkFirebaseReady()) {
        showError('registerError', '⚠️ System is still loading. Please wait 5 seconds and try again.');
        console.error('Firebase not ready for registration');
        return;
    }

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const accountType = document.getElementById('regAccountType').value;
    const btn = document.getElementById('registerBtn');

    // Clear previous errors
    document.getElementById('registerError').innerHTML = '';

    // Validation
    if (!name || !email || !password || !phone) {
        showError('registerError', '⚠️ Please fill in all fields');
        return;
    }

    if (name.length < 2) {
        showError('registerError', '⚠️ Please enter a valid name');
        return;
    }

    if (password.length < 6) {
        showError('registerError', '⚠️ Password must be at least 6 characters');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('registerError', '⚠️ Please enter a valid email address');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating Account...';
    showLoading('registerError', '⏳ Creating your account...');

    try {
        console.log('📝 Starting registration for:', email);

        // Double-check Firebase is available
        if (!window.auth || !window.fb || !window.db) {
            throw new Error('Firebase services not available');
        }

        // Create Firebase Auth user
        console.log('Creating Firebase Auth user...');
        const userCredential = await window.fb.createUserWithEmailAndPassword(
            window.auth, 
            email, 
            password
        );
        
        const user = userCredential.user;
        console.log('✅ Firebase user created:', user.uid);

        const accountNumber = generateAccountNumber();

        // Create user document in Firestore
        console.log('Creating Firestore document...');
        const userDocRef = window.fb.doc(window.db, 'users', user.uid);
        await window.fb.setDoc(userDocRef, {
            name: name,
            email: email,
            phone: phone,
            accountType: accountType,
            accountNumber: accountNumber,
            balance: 0,
            createdDate: new Date().toISOString(),
            profilePicUrl: null,
            uid: user.uid
        });

        console.log('✅ User document created successfully');

        showSuccess('registerError', '✅ Account created successfully! Redirecting to login...');
        
        setTimeout(() => {
            document.getElementById('regName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPhone').value = '';
            document.getElementById('regPassword').value = '';
            showScreen('loginScreen');
            document.getElementById('registerError').innerHTML = '';
            btn.disabled = false;
            btn.textContent = 'Submit Application';
        }, 2500);

    } catch (error) {
        console.error('❌ Registration error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let errorMsg = '❌ ';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMsg += 'This email is already registered. Please use the Sign In button instead.';
        } else if (error.code === 'auth/invalid-email') {
            errorMsg += 'Invalid email address format. Please check and try again.';
        } else if (error.code === 'auth/weak-password') {
            errorMsg += 'Password is too weak. Please use at least 6 characters.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMsg += 'Network error. Please check your internet connection and try again.';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMsg += 'Registration is temporarily disabled. Please contact support.';
        } else if (error.message && error.message.includes('Firebase')) {
            errorMsg += 'System error. Please refresh the page and try again.';
        } else {
            errorMsg += 'Registration failed. Please try again or contact support.';
        }
        
        showError('registerError', errorMsg);
        btn.disabled = false;
        btn.textContent = 'Submit Application';
    }
}

// Login - COMPLETE FIXED VERSION
async function login() {
    // Check Firebase ready
    if (!checkFirebaseReady()) {
        showError('loginError', '⚠️ System is still loading. Please wait 5 seconds and try again.');
        return;
    }

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');

    document.getElementById('loginError').innerHTML = '';

    if (!email || !password) {
        showError('loginError', '⚠️ Please enter email and password');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('loginError', '⚠️ Please enter a valid email address');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing In...';
    showLoading('loginError', '⏳ Signing in...');

    try {
        console.log('🔐 Attempting login for:', email);

        if (!window.auth || !window.fb) {
            throw new Error('Firebase not available');
        }

        await window.fb.signInWithEmailAndPassword(window.auth, email, password);
        
        console.log('✅ Login successful');
        showSuccess('loginError', '✅ Login successful! Loading your account...');
        
        setTimeout(() => {
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginError').innerHTML = '';
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }, 1500);

    } catch (error) {
        console.error('❌ Login error:', error);
        
        let errorMsg = '❌ ';
        if (error.code === 'auth/user-not-found') {
            errorMsg += 'No account found with this email. Please create an account first.';
        } else if (error.code === 'auth/wrong-password') {
            errorMsg += 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
            errorMsg += 'Invalid email format.';
        } else if (error.code === 'auth/user-disabled') {
            errorMsg += 'This account has been disabled. Please contact support.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMsg += 'Network error. Check your internet connection.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMsg += 'Too many failed attempts. Please try again later.';
        } else {
            errorMsg += 'Login failed. Please check your credentials and try again.';
        }
        
        showError('loginError', errorMsg);
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

// Load User Data
async function loadUserData(uid) {
    try {
        const userDocRef = window.fb.doc(window.db, 'users', uid);
        const userDoc = await window.fb.getDoc(userDocRef);
        
        if (userDoc.exists()) {
            currentUserData = userDoc.data();
            console.log('✅ User data loaded:', currentUserData.name);
        } else {
            console.error('❌ User document not found');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load Dashboard
function loadDashboard() {
    if (!currentUserData) {
        console.error('❌ No user data available');
        return;
    }

    document.getElementById('userName').textContent = currentUserData.name || 'User';
    document.getElementById('userAccountNumber').textContent = currentUserData.accountNumber || 'N/A';
    document.getElementById('balance').textContent = formatAmount(currentUserData.balance || 0);
    document.getElementById('accountType').textContent = 
        (currentUserData.accountType || 'current').charAt(0).toUpperCase() + 
        (currentUserData.accountType || 'current').slice(1) + ' Account';
    document.getElementById('userAvatar').textContent = getInitials(currentUserData.name);
    
    loadRecentTransactions();
}

// Load Recent Transactions
async function loadRecentTransactions() {
    const list = document.getElementById('recentTransactions');
    
    try {
        const transRef = window.fb.collection(window.db, 'users', currentUser, 'transactions');
        const transSnap = await window.fb.getDocs(transRef);
        
        if (transSnap.empty) {
            list.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No transactions yet</p>';
            return;
        }

        const transactions = [];
        transSnap.forEach(doc => {
            transactions.push({ id: doc.id, ...doc.data() });
        });

        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recent = transactions.slice(0, 5);
        
        list.innerHTML = recent.map(t => formatTransaction(t)).join('');
    } catch (error) {
        console.error('Error loading transactions:', error);
        list.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 20px;">Error loading transactions</p>';
    }
}

// Load All Transactions
async function loadAllTransactions() {
    const list = document.getElementById('allTransactions');
    
    try {
        const transRef = window.fb.collection(window.db, 'users', currentUser, 'transactions');
        const transSnap = await window.fb.getDocs(transRef);
        
        if (transSnap.empty) {
            list.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No transactions yet</p>';
            return;
        }

        const transactions = [];
        transSnap.forEach(doc => {
            transactions.push({ id: doc.id, ...doc.data() });
        });

        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        list.innerHTML = transactions.map(t => formatTransaction(t)).join('');
    } catch (error) {
        console.error('Error loading transactions:', error);
        list.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 20px;">Error loading transactions</p>';
    }
}

// Format Transaction
function formatTransaction(t) {
    const date = new Date(t.date);
    const formattedDate = date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let statusBadge = '';
    if (t.status === 'pending') {
        statusBadge = '<span class="transaction-status status-pending">⏳ Pending</span>';
    } else if (t.status === 'approved') {
        statusBadge = '<span class="transaction-status status-approved">✅ Approved</span>';
    } else if (t.status === 'rejected') {
        statusBadge = '<span class="transaction-status status-rejected">❌ Rejected</span>';
    }

    const className = t.status === 'pending' ? 'pending' : (t.isCredit ? 'credit' : 'debit');
    const amountClass = t.status === 'pending' ? 'pending' : (t.isCredit ? 'credit' : 'debit');
    
    return `
        <div class="transaction ${className}">
            <div class="transaction-info">
                <div class="transaction-type">${t.type}</div>
                <div class="transaction-date">${formattedDate}</div>
                ${statusBadge}
            </div>
            <div class="transaction-amount ${amountClass}">
                ${t.isCredit ? '+' : '-'}${formatAmount(t.amount)}
            </div>
        </div>
    `;
}

// Load Profile
function loadProfile() {
    if (!currentUserData) return;

    document.getElementById('profileName').textContent = currentUserData.name || 'N/A';
    document.getElementById('profileEmail').textContent = currentUserData.email || 'N/A';
    document.getElementById('profilePhone').textContent = currentUserData.phone || 'Not provided';
    document.getElementById('profileAccount').textContent = currentUserData.accountNumber || 'N/A';
    document.getElementById('profileType').textContent = 
        (currentUserData.accountType || 'current').charAt(0).toUpperCase() + 
        (currentUserData.accountType || 'current').slice(1) + ' Account';
    
    const date = new Date(currentUserData.createdDate);
    document.getElementById('profileDate').textContent = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    const picDisplay = document.getElementById('profilePicDisplay');
    if (currentUserData.profilePicUrl) {
        picDisplay.innerHTML = `<img src="${currentUserData.profilePicUrl}" class="profile-pic" alt="Profile">`;
    } else {
        picDisplay.innerHTML = `<div class="profile-pic-placeholder">${getInitials(currentUserData.name)}</div>`;
    }
}

// Upload Profile Picture
async function uploadProfilePic() {
    const file = document.getElementById('profilePicInput').files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ File too large. Please choose an image under 5MB.');
        return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
        alert('❌ Please select an image file.');
        return;
    }

    try {
        console.log('Uploading profile picture...');
        const storageRef = window.fb.ref(window.storage, `profile-pics/${currentUser}`);
        await window.fb.uploadBytes(storageRef, file);
        const downloadURL = await window.fb.getDownloadURL(storageRef);

        const userDocRef = window.fb.doc(window.db, 'users', currentUser);
        await window.fb.setDoc(userDocRef, {
            profilePicUrl: downloadURL
        }, { merge: true });

        currentUserData.profilePicUrl = downloadURL;
        loadProfile();
        
        alert('✅ Profile picture updated successfully!');
    } catch (error) {
        console.error('Error uploading:', error);
        alert('❌ Failed to upload profile picture. Please try again.');
    }
}

// Request Deposit
async function requestDeposit() {
    const amount = parseFloat(document.getElementById('depositRequestAmount').value);
    const notes = document.getElementById('depositRequestNotes').value.trim();
    
    if (!amount || amount <= 0) {
        showError('depositRequestError', '⚠️ Please enter a valid amount');
        return;
    }

    if (amount > 10000000) {
        showError('depositRequestError', '⚠️ Maximum request amount is $10,000,000');
        return;
    }

    try {
        showLoading('depositRequestError', '⏳ Submitting request...');

        const transRef = window.fb.collection(window.db, 'users', currentUser, 'transactions');
        await window.fb.addDoc(transRef, {
            type: 'Deposit Request',
            amount: amount,
            date: new Date().toISOString(),
            isCredit: true,
            status: 'pending',
            notes: notes || ''
        });

        const requestsRef = window.fb.collection(window.db, 'pendingRequests');
        await window.fb.addDoc(requestsRef, {
            userId: currentUser,
            userEmail: currentUserData.email,
            userName: currentUserData.name,
            type: 'deposit',
            amount: amount,
            notes: notes || '',
            date: new Date().toISOString(),
            status: 'pending'
        });

        showSuccess('depositRequestError', '✅ Deposit request submitted successfully!');
        
        setTimeout(() => {
            closeModal('depositRequestModal');
            document.getElementById('depositRequestAmount').value = '';
            document.getElementById('depositRequestNotes').value = '';
            loadDashboard();
        }, 1500);

    } catch (error) {
        console.error('Deposit request error:', error);
        showError('depositRequestError', '❌ Failed to submit request. Please try again.');
    }
}

// Request Withdrawal
async function requestWithdraw() {
    const amount = parseFloat(document.getElementById('withdrawRequestAmount').value);
    const notes = document.getElementById('withdrawRequestNotes').value.trim();
    
    if (!amount || amount <= 0) {
        showError('withdrawRequestError', '⚠️ Please enter a valid amount');
        return;
    }

    if (amount > (currentUserData.balance || 0)) {
        showError('withdrawRequestError', '⚠️ Insufficient funds in your account');
        return;
    }

    if (!notes) {
        showError('withdrawRequestError', '⚠️ Please provide a reason for withdrawal');
        return;
    }

    try {
        showLoading('withdrawRequestError', '⏳ Submitting request...');

        const transRef = window.fb.collection(window.db, 'users', currentUser, 'transactions');
        await window.fb.addDoc(transRef, {
            type: 'Withdrawal Request',
            amount: amount,
            date: new Date().toISOString(),
            isCredit: false,
            status: 'pending',
            notes: notes
        });

        const requestsRef = window.fb.collection(window.db, 'pendingRequests');
        await window.fb.addDoc(requestsRef, {
            userId: currentUser,
            userEmail: currentUserData.email,
            userName: currentUserData.name,
            type: 'withdrawal',
            amount: amount,
            notes: notes,
            date: new Date().toISOString(),
            status: 'pending'
        });

        showSuccess('withdrawRequestError', '✅ Withdrawal request submitted successfully!');
        
        setTimeout(() => {
            closeModal('withdrawRequestModal');
            document.getElementById('withdrawRequestAmount').value = '';
            document.getElementById('withdrawRequestNotes').value = '';
            loadDashboard();
        }, 1500);

    } catch (error) {
        console.error('Withdrawal error:', error);
        showError('withdrawRequestError', '❌ Failed to submit request. Please try again.');
    }
}

// Logout
async function logout() {
    try {
        await window.fb.signOut(window.auth);
        currentUser = null;
        currentUserData = null;
        showScreen('welcomeScreen');
        console.log('✅ Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        alert('❌ Logout failed. Please refresh the page.');
    }
}

console.log('💎 Customer Portal Script Loaded');
console.log('⏳ Waiting for Firebase to initialize...');
