// Global variables
let currentUser = null;
let currentUserData = null;
let currentCurrency = 'GBP';
let currencySymbol = '£';

// Wait for Firebase to load
setTimeout(() => {
    console.log('🚀 Initializing Customer Portal...');
    
    if (!window.auth || !window.db) {
        console.error('❌ Firebase not loaded properly');
        setTimeout(initAuth, 1000);
        return;
    }

    initAuth();
}, 1500);

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

// Registration - FIXED VERSION
async function register() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const accountType = document.getElementById('regAccountType').value;
    const btn = document.getElementById('registerBtn');

    // Clear previous errors
    document.getElementById('registerError').innerHTML = '';

    if (!name || !email || !password || !phone) {
        showError('registerError', '⚠️ Please fill in all fields');
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

        // Check if Firebase is ready
        if (!window.auth || !window.fb) {
            throw new Error('Firebase not initialized');
        }

        // Create Firebase Auth user
        const userCredential = await window.fb.createUserWithEmailAndPassword(
            window.auth, 
            email, 
            password
        );
        
        const user = userCredential.user;
        console.log('✅ Firebase user created:', user.uid);

        const accountNumber = generateAccountNumber();

        // Create user document in Firestore
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

        console.log('✅ User document created in Firestore');

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
        }, 2000);

    } catch (error) {
        console.error('❌ Registration error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let errorMsg = '❌ Registration failed. ';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMsg += 'This email is already registered. Please login instead.';
        } else if (error.code === 'auth/invalid-email') {
            errorMsg += 'Invalid email address format.';
        } else if (error.code === 'auth/weak-password') {
            errorMsg += 'Password is too weak. Use at least 6 characters.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMsg += 'Network error. Check your internet connection.';
        } else if (error.message.includes('Firebase not initialized')) {
            errorMsg += 'System not ready. Please refresh the page and try again.';
        } else {
            errorMsg += error.message || 'Please try again.';
        }
        
        showError('registerError', errorMsg);
        btn.disabled = false;
        btn.textContent = 'Submit Application';
    }
}

// Login - FIXED VERSION
async function login() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');

    document.getElementById('loginError').innerHTML = '';

    if (!email || !password) {
        showError('loginError', '⚠️ Please enter email and password');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing In...';
    showLoading('loginError', '⏳ Signing in...');

    try {
        console.log('🔐 Attempting login for:', email);

        if (!window.auth || !window.fb) {
            throw new Error('Firebase not initialized');
        }

        await window.fb.signInWithEmailAndPassword(window.auth, email, password);
        
        console.log('✅ Login successful');
        showSuccess('loginError', '✅ Login successful!');
        
        setTimeout(() => {
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginError').innerHTML = '';
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }, 1000);

    } catch (error) {
        console.error('❌ Login error:', error);
        
        let errorMsg = '❌ ';
        if (error.code === 'auth/user-not-found') {
            errorMsg += 'No account found with this email. Please register first.';
        } else if (error.code === 'auth/wrong-password') {
            errorMsg += 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
            errorMsg += 'Invalid email format.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMsg += 'Network error. Check your internet connection.';
        } else if (error.message.includes('Firebase not initialized')) {
            errorMsg += 'System not ready. Please refresh the page and try again.';
        } else {
            errorMsg += 'Login failed. Please check your credentials.';
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

    try {
        const storageRef = window.fb.ref(window.storage, `profile-pics/${currentUser}`);
        await window.fb.uploadBytes(storageRef, file);
        const downloadURL = await window.fb.getDownloadURL(storageRef);

        const userDocRef = window.fb.doc(window.db, 'users', currentUser);
        await window.fb.setDoc(userDocRef, {
            profilePicUrl: downloadURL
        }, { merge: true });

        currentUserData.profilePicUrl = downloadURL;
        loadProfile();
        
        alert('✅ Profile picture updated!');
    } catch (error) {
        console.error('Error uploading:', error);
        alert('❌ Failed to upload. Try again.');
    }
}

// Request Deposit
async function requestDeposit() {
    const amount = parseFloat(document.getElementById('depositRequestAmount').value);
    const notes = document.getElementById('depositRequestNotes').value.trim();
    
    if (!amount || amount <= 0) {
        showError('depositRequestError', '⚠️ Enter valid amount');
        return;
    }

    try {
        showLoading('depositRequestError', '⏳ Submitting...');

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

        showSuccess('depositRequestError', '✅ Request submitted!');
        
        setTimeout(() => {
            closeModal('depositRequestModal');
            document.getElementById('depositRequestAmount').value = '';
            document.getElementById('depositRequestNotes').value = '';
            loadDashboard();
        }, 1500);

    } catch (error) {
        console.error('Deposit request error:', error);
        showError('depositRequestError', '❌ Failed. Try again.');
    }
}

// Request Withdrawal
async function requestWithdraw() {
    const amount = parseFloat(document.getElementById('withdrawRequestAmount').value);
    const notes = document.getElementById('withdrawRequestNotes').value.trim();
    
    if (!amount || amount <= 0) {
        showError('withdrawRequestError', '⚠️ Enter valid amount');
        return;
    }

    if (amount > (currentUserData.balance || 0)) {
        showError('withdrawRequestError', '⚠️ Insufficient funds');
        return;
    }

    if (!notes) {
        showError('withdrawRequestError', '⚠️ Provide reason');
        return;
    }

    try {
        showLoading('withdrawRequestError', '⏳ Submitting...');

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

        showSuccess('withdrawRequestError', '✅ Request submitted!');
        
        setTimeout(() => {
            closeModal('withdrawRequestModal');
            document.getElementById('withdrawRequestAmount').value = '';
            document.getElementById('withdrawRequestNotes').value = '';
            loadDashboard();
        }, 1500);

    } catch (error) {
        console.error('Withdrawal error:', error);
        showError('withdrawRequestError', '❌ Failed. Try again.');
    }
}

// Logout
async function logout() {
    try {
        await window.fb.signOut(window.auth);
        currentUser = null;
        currentUserData = null;
        showScreen('welcomeScreen');
        console.log('✅ Logged out');
    } catch (error) {
        console.error('Logout error:', error);
        alert('❌ Logout failed');
    }
}

console.log('💎 Customer Portal Ready');
