const API_URL = '/api';

// State
let currentUser = null;
let currentAccount = null;
let transactions = [];
let currentTxAction = 'deposit';

// DOM Elements
const authContainer = document.getElementById('auth-container');
const dashboard = document.getElementById('dashboard');
const txTableBody = document.getElementById('tx-body');
const noTxMsg = document.getElementById('no-tx-msg');
const searchInput = document.getElementById('search-tx');
const filterSelect = document.getElementById('filter-type');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if logged in (mock session via localStorage)
    const savedUser = localStorage.getItem('vaultUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        loadDashboard();
    }
});

// UI Navigation
function showForm(formName) {
    document.getElementById('login-form-container').classList.add('hidden');
    document.getElementById('register-form-container').classList.add('hidden');
    document.getElementById('forgot-form-container').classList.add('hidden');

    document.getElementById(`${formName}-form-container`).classList.remove('hidden');
    clearErrors();
}

function clearErrors() {
    document.querySelectorAll('.error-msg, .msg').forEach(el => el.textContent = '');
}

// Authentication Forms
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        
        if (res.ok) {
            currentUser = data;
            localStorage.setItem('vaultUser', JSON.stringify(currentUser));
            loadDashboard();
        } else {
            document.getElementById('login-error').textContent = data.error;
        }
    } catch (err) {
        document.getElementById('login-error').textContent = "Connection error.";
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('reg-username').value;
    const p = document.getElementById('reg-password').value;
    
    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        
        if (res.ok) {
            showForm('login');
            document.getElementById('login-username').value = u;
            document.getElementById('login-error').style.color = 'var(--success)';
            document.getElementById('login-error').textContent = "Registration successful. Please login.";
        } else {
            document.getElementById('reg-error').textContent = data.error;
        }
    } catch (err) {
        document.getElementById('reg-error').textContent = "Connection error.";
    }
});

document.getElementById('forgot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('forgot-username').value;
    const p = document.getElementById('forgot-password').value;
    
    try {
        const res = await fetch(`${API_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('forgot-msg').textContent = data.message;
            document.getElementById('forgot-msg').style.color = "var(--success)";
            setTimeout(() => showForm('login'), 2000);
        } else {
            document.getElementById('forgot-msg').textContent = data.error;
            document.getElementById('forgot-msg').style.color = "var(--danger)";
        }
    } catch (err) {
        document.getElementById('forgot-msg').textContent = "Connection error.";
    }
});

function logout() {
    localStorage.removeItem('vaultUser');
    currentUser = null;
    currentAccount = null;
    authContainer.classList.remove('hidden');
    dashboard.classList.add('hidden');
    showForm('login');
    document.getElementById('login-form').reset();
}

// Dashboard Logic
async function loadDashboard() {
    authContainer.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('user-greeting').textContent = `Hello, ${currentUser.username}`;
    
    await fetchAccountData();
    if(currentAccount) {
        await fetchTransactions();
    }
}

async function fetchAccountData() {
    try {
        const res = await fetch(`${API_URL}/accounts/${currentUser.userId}`);
        const data = await res.json();
        if (data && data.length > 0) {
            currentAccount = data[0]; // Assuming 1 account per user for simplicity
            updateBalanceUI();
        }
    } catch (err) {
        console.error("Failed to fetch account");
    }
}

function updateBalanceUI() {
    const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
    document.getElementById('account-balance').textContent = formatter.format(currentAccount.balance);
    document.getElementById('account-number').textContent = currentAccount.accountNumber;
}

// Transaction Logic
function switchActionTab(action) {
    currentTxAction = action;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const btnText = action === 'deposit' ? 'Execute Deposit' : 'Execute Withdrawal';
    document.getElementById('tx-btn').textContent = btnText;
    document.getElementById('tx-msg').textContent = '';
}

document.getElementById('transaction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const msgEl = document.getElementById('tx-msg');
    
    if(!currentAccount) return;
    
    try {
        const res = await fetch(`${API_URL}/${currentTxAction}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: currentAccount.id, amount: amount })
        });
        const data = await res.json();
        
        if (res.ok) {
            currentAccount.balance = data.balance;
            updateBalanceUI();
            fetchTransactions(); // Refresh history
            
            msgEl.textContent = data.message;
            msgEl.style.color = "var(--success)";
            document.getElementById('tx-amount').value = '';
            
            // Clear message after 3s
            setTimeout(() => msgEl.textContent = '', 3000);
        } else {
            msgEl.textContent = data.error;
            msgEl.style.color = "var(--danger)";
        }
    } catch (err) {
        msgEl.textContent = "Connection error.";
    }
});

// History Logic
async function fetchTransactions() {
    try {
        const res = await fetch(`${API_URL}/transactions/${currentAccount.id}`);
        transactions = await res.json();
        renderTransactions();
    } catch (err) {
        console.error("Failed to fetch transactions");
    }
}

function renderTransactions() {
    const query = searchInput.value.toLowerCase();
    const filter = filterSelect.value;
    
    const filtered = transactions.filter(tx => {
        const matchSearch = tx.amount.toString().includes(query) || tx.timestamp.includes(query);
        const matchFilter = filter === 'ALL' || tx.type === filter;
        return matchSearch && matchFilter;
    });
    
    txTableBody.innerHTML = '';
    
    if (filtered.length === 0) {
        noTxMsg.style.display = 'block';
    } else {
        noTxMsg.style.display = 'none';
        
        filtered.forEach(tx => {
            const date = new Date(tx.timestamp).toLocaleString();
            const isDeposit = tx.type === 'DEPOSIT';
            const sign = isDeposit ? '+' : '-';
            const amountClass = isDeposit ? 'positive' : 'negative';
            const typeClass = tx.type.toLowerCase();
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${date}</td>
                <td><span class="type-badge ${typeClass}">${tx.type}</span></td>
                <td class="amount ${amountClass}">${sign}₹${tx.amount.toFixed(2)}</td>
            `;
            txTableBody.appendChild(tr);
        });
    }
}

// Event Listeners for Search/Filter
searchInput.addEventListener('input', renderTransactions);
filterSelect.addEventListener('change', renderTransactions);
