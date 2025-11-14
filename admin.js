
// Global variables
let isLoggedIn = false;
let selectedCustomerId = null;
let currentCurrency = 'GBP';
let currencySymbol = '£';

// CHANGE THIS TO YOUR SECURE PASSWORD
const ADMIN_EMAIL = 'admin@sterlingvault.co.uk';
const ADMIN_PASSWORD = 'SecureAdmin2025!'; // ⚠️ CHANGE THIS!

// Helper Functions
function changeCurrency(currency) {
    currentCurrency = currency;
    currencySymbol = currency === 'GBP' ? '£' : '$';
    
    document.querySelectorAll('.currency-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (isLoggedIn) {
        updateAdminStats();
        loadCustomers();
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
    
    if (tab === 'customers') loadCustomers();
    if (tab === 'requests') loadPendingRequests();
    if (tab === 'dashboard') updateAdminStats();
}

// Admin Login
async function adminLogin() {
    const email = document.getElementById('adminEmail').value.trim().toLowerCase();
    const password = document.getElementById('adminPassword').value;
    const btn = document.getElementById('loginBtn');

    if (!email || !password) {
        showError('loginError', '⚠️ Please enter credentials');
        return;
    }

    btn.disabled = true;
    showLoading('loginError', '⏳ Verifying...');

    // Simple admin check (no Firebase auth for admin)
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        showSuccess('loginError', '✅ Login successful!');
        
        setTimeout(() => {
            isLoggedIn = true;
            document.getElementById('adminEmail').value = '';
            document.getElementById('adminPassword').value = '';
            document.getElementById('loginError').innerHTML = '';
            showScreen('dashboardScreen');
            updateAdminStats();
            btn.disabled = false;
        }, 1000);
    } else {
        showError('loginError', '❌ Invalid admin credentials');
        btn.disabled = false;
    }
}

// Update Admin Stats
async function updateAdminStats() {
    try {
        const usersSnap = await window.fb.getDocs(window.fb.collection(window.db, 'users'));
        
        let totalBalance = 0;
        usersSnap.forEach(doc => {
            totalBalance += doc.data().balance || 0;
        });

        const requestsRef = window.fb.collection(window.db, 'pendingRequests');
        const q = window.fb.query(requestsRef, window.fb.where('status', '==', 'pending'));
        const requestsSnap = await window.fb.getDocs(q);

        document.getElementById('totalCustomers').textContent = usersSnap.size;
        document.getElementById('totalBalance').textContent = formatAmount(totalBalance);
        document.getElementById('pendingRequestsCount').textContent = requestsSnap.size;

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load Customers
async function loadCustomers() {
    const list = document.getElementById('customersList');
    
    try {
        showLoading('customersList', '⏳ Loading customers...');
        
        const usersSnap = await window.fb.getDocs(window.fb.collection(window.db, 'users'));
        
        if (usersSnap.empty) {
            list.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No customers yet</p>';
            return;
        }

        const customers = [];
        usersSnap.forEach(doc => {
            customers.push({ id: doc.id, ...doc.data() });
        });

        // Sort by name
        customers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        list.innerHTML = customers.map(acc => `
            <div class="user-card">
                <div class="user-card-header">
                    <div class="user-card-info">
                        <h4>${acc.name || 'N/A'}</h4>
                        <p>📧 ${acc.email || 'N/A'}</p>
                        <p>📞 ${acc.phone || 'No phone'}</p>
                        <p>🏦 ${acc.accountNumber || 'N/A'}</p>
                        <p>💰 Balance: <strong>${formatAmount(acc.balance || 0)}</strong></p>
                        <p style="color: #999; font-size: 0.85em;">Joined: ${new Date(acc.createdDate).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div class="user-card-actions">
                        <button class="success small" onclick="showFundModal('${acc.id}', '${acc.name}', '${acc.accountNumber}')">💰 Fund</button>
                        <button class="small" onclick="viewCustomerDetails('${acc.id}')">📊 Details</button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading customers:', error);
        list.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 20px;">Error loading customers</p>';
    }
}

// Show Fund Modal
function showFundModal(userId, userName, accountNumber) {
    selectedCustomerId = userId;
    document.getElementById('fundCustomerName').textContent = userName || 'N/A';
    document.getElementById('fundCustomerAccount').textContent = accountNumber || 'N/A';
    showModal('fundModal');
}

// Fund Account
async function fundAccount() {
    const amount = parseFloat(document.getElementById('fundAmount').value);
    const notes = document.getElementById('fundNotes').value.trim();

    if (!amount || amount <= 0) {
        showError('fundError', '⚠️ Enter valid amount');
        return;
    }

    if (!notes) {
        showError('fundError', '⚠️ Provide reason');
        return;
    }

    try {
        showLoading('fundError', '⏳ Processing...');

        // Get current balance
        const userDocRef = window.fb.doc(window.db, 'users', selectedCustomerId);
        const userDoc = await window.fb.getDoc(userDocRef);
        const currentBalance = userDoc.data().balance || 0;

        // Update balance
        await window.fb.updateDoc(userDocRef, {
            balance: currentBalance + amount
        });

        // Add transaction
        await window.fb.addDoc(window.fb.collection(window.db, 'users', selectedCustomerId, 'transactions'), {
            type: 'Admin Credit - ' + notes,
            amount: amount,
            date: new Date().toISOString(),
            isCredit: true,
            status: 'approved'
        });

        showSuccess('fundError', '✅ Account funded successfully!');
        
        setTimeout(() => {
            closeModal('fundModal');
            document.getElementById('fundAmount').value = '';
            document.getElementById('fundNotes').value = '';
            loadCustomers();
            updateAdminStats();
        }, 1500);

    } catch (error) {
        console.error('Fund error:', error);
        showError('fundError', '❌ Failed to fund account');
    }
}

// View Customer Details
async function viewCustomerDetails(userId) {
    try {
        showModal('detailsModal');
        document.getElementById('detailsContent').innerHTML = '<div class="loading">⏳ Loading details...</div>';

        const userDocRef = window.fb.doc(window.db, 'users', userId);
        const userDoc = await window.fb.getDoc(userDocRef);
        const userData = userDoc.data();

        const transSnap = await window.fb.getDocs(window.fb.collection(window.db, 'users', userId, 'transactions'));
        
        const transactions = [];
        transSnap.forEach(doc => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        const transHistory = transactions.length > 0 
            ? transactions.map(t => `
                <div style="padding: 10px; background: #f8f9fa; margin: 5px 0; border-radius: 5px;">
                    <strong>${t.type}</strong> - ${formatAmount(t.amount)}<br>
                    <small>${new Date(t.date).toLocaleString('en-GB')}</small>
                    ${t.status ? `<span style="background: ${t.status === 'approved' ? '#d4edda' : t.status === 'pending' ? '#fff3cd' : '#f8d7da'}; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">${t.status}</span>` : ''}
                </div>
            `).join('')
            : '<p style="color: #666;">No transactions yet</p>';

        document.getElementById('detailsContent').innerHTML = `
            <div class="info-card">
                <h3 style="color: #2a5298; margin-bottom: 20px;">${userData.name || 'N/A'}</h3>
                <div class="info-row">
                    <span class="info-label">Email</span>
                    <span class="info-value">${userData.email || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone</span>
                    <span class="info-value">${userData.phone || 'Not provided'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Account Number</span>
                    <span class="info-value">${userData.accountNumber || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Account Type</span>
                    <span class="info-value">${userData.accountType || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Balance</span>
                    <span class="info-value">${formatAmount(userData.balance || 0)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Total Transactions</span>
                    <span class="info-value">${transactions.length}</span>
                </div>
            </div>
            <h4 style="margin: 20px 0 10px; color: #333;">Transaction History</h4>
            <div style="max-height: 300px; overflow-y: auto;">
                ${transHistory}
            </div>
        `;

    } catch (error) {
        console.error('Error viewing details:', error);
        document.getElementById('detailsContent').innerHTML = '<div class="error">❌ Failed to load customer details</div>';
    }
}

// Load Pending Requests
async function loadPendingRequests() {
    const list = document.getElementById('requestsList');
    
    try {
        showLoading('requestsList', '⏳ Loading requests...');
        
        const requestsRef = window.fb.collection(window.db, 'pendingRequests');
        const q = window.fb.query(requestsRef, window.fb.where('status', '==', 'pending'));
        const requestsSnap = await window.fb.getDocs(q);
        
        if (requestsSnap.empty) {
            list.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No pending requests</p>';
            return;
        }

        const requests = [];
        requestsSnap.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() });
        });

        // Sort by date (newest first)
        requests.sort((a, b) => new Date(b.date) - new Date(a.date));

        list.innerHTML = requests.map(req => {
            const date = new Date(req.date);
            const formattedDate = date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="pending-request">
                    <div class="request-header">
                        <div class="request-info">
                            <h4>${req.type === 'deposit' ? '💰 Deposit' : '💸 Withdrawal'} Request</h4>
                            <p><strong>Customer:</strong> ${req.userName || 'N/A'}</p>
                            <p><strong>Email:</strong> ${req.userEmail || 'N/A'}</p>
                            <p><strong>Date:</strong> ${formattedDate}</p>
                            ${req.notes ? `<p><strong>Notes:</strong> ${req.notes}</p>` : ''}
                        </div>
                        <div class="request-amount">${formatAmount(req.amount || 0)}</div>
                    </div>
                    <div class="request-actions">
                        <button class="success small" onclick="approveRequest('${req.id}', '${req.userId}', '${req.type}', ${req.amount})">✅ Approve</button>
                        <button class="danger small" onclick="rejectRequest('${req.id}', '${req.userId}', '${req.type}', ${req.amount})">❌ Reject</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading requests:', error);
        list.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 20px;">Error loading requests</p>';
    }
}

// Approve Request
async function approveRequest(requestId, userId, type, amount) {
    if (!confirm('Are you sure you want to APPROVE this request?')) return;

    try {
        // Get current balance
        const userDocRef = window.fb.doc(window.db, 'users', userId);
        const userDoc = await window.fb.getDoc(userDocRef);
        const currentBalance = userDoc.data().balance || 0;

        // Calculate new balance
        const newBalance = type === 'deposit' ? currentBalance + amount : currentBalance - amount;
        
        // Update balance
        await window.fb.updateDoc(userDocRef, {
            balance: newBalance
        });

        // Update request status
        const requestDocRef = window.fb.doc(window.db, 'pendingRequests', requestId);
        await window.fb.updateDoc(requestDocRef, {
            status: 'approved'
        });

        // Update transaction status
        const transSnap = await window.fb.getDocs(window.fb.collection(window.db, 'users', userId, 'transactions'));
        
        for (const doc of transSnap.docs) {
            const trans = doc.data();
            if (trans.status === 'pending' && trans.amount === amount && 
                ((type === 'deposit' && trans.isCredit) || (type === 'withdrawal' && !trans.isCredit))) {
                await window.fb.updateDoc(doc.ref, {
                    status: 'approved',
                    type: type === 'deposit' ? '✅ Deposit (Approved)' : '✅ Withdrawal (Approved)'
                });
                break;
            }
        }

        alert('✅ Request approved successfully!');
        loadPendingRequests();
        updateAdminStats();

    } catch (error) {
        console.error('Approve error:', error);
        alert('❌ Failed to approve request');
    }
}

// Reject Request
async function rejectRequest(requestId, userId, type, amount) {
    if (!confirm('Are you sure you want to REJECT this request?')) return;

    try {
        // Update request status
        const requestDocRef = window.fb.doc(window.db, 'pendingRequests', requestId);
        await window.fb.updateDoc(requestDocRef, {
            status: 'rejected'
        });

        // Update transaction status
        const transSnap = await window.fb.getDocs(window.fb.collection(window.db, 'users', userId, 'transactions'));
        
        for (const doc of transSnap.docs) {
            const trans = doc.data();
            if (trans.status === 'pending' && trans.amount === amount && 
                ((type === 'deposit' && trans.isCredit) || (type === 'withdrawal' && !trans.isCredit))) {
                await window.fb.updateDoc(doc.ref, {
                    status: 'rejected',
                    type: type === 'deposit' ? '❌ Deposit (Rejected)' : '❌ Withdrawal (Rejected)'
                });
                break;
            }
        }

        alert('✅ Request rejected successfully!');
        loadPendingRequests();
        updateAdminStats();

    } catch (error) {
        console.error('Reject error:', error);
        alert('❌ Failed to reject request');
    }
}

// Logout
function logout() {
    isLoggedIn = false;
    showScreen('loginScreen');
    console.log('✅ Admin logged out');
}

console.log('💎 Admin Panel Ready');
console.log('⚠️ IMPORTANT: Change the admin password in admin.js!');
