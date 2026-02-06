import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://saeufvynqmqcatlseedb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZXVmdnlucW1xY2F0bHNlZWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTg3MDYsImV4cCI6MjA4NTg5NDcwNn0.zYEb_smm9YGH4fRnfsMJcjZo00lFbkdBBsF1XdL3FaE';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginContainer = document.getElementById('login-container');
const loginBtn = document.getElementById('login-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const dashboardModal = document.getElementById('dashboard-modal');
const welcomeText = document.getElementById('welcome-text');
const accountNameElem = document.getElementById('account-name');
const balanceElem = document.getElementById('balance');
const transactionsTableBody = document.querySelector('#transactions-table tbody');
const logoutBtn = document.getElementById('logout-btn');
const spinnerOverlay = document.getElementById('spinner-overlay');

let currentUser = null;

// Toggle Password Visibility
document.getElementById('toggle-password').addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  document.getElementById('toggle-password').textContent = isPassword ? 'Hide' : 'Show';
});

// Login function
async function performLogin(email, password) {
  try {
    spinnerOverlay.style.display = 'flex';
    loginError.textContent = '';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    currentUser = data.user;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, account_name, balance')
      .eq('id', currentUser.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') throw profileError;

    spinnerOverlay.style.display = 'none';
    await showDashboard(profile || {});
  } catch (err) {
    spinnerOverlay.style.display = 'none';
    loginError.textContent = err.message.includes('Invalid login credentials') 
      ? 'Invalid email or password' 
      : 'Login failed – check console';
    loginError.classList.add('shake');
    console.error('Login error:', err);
  }
}

// Show dashboard
async function showDashboard(profile = {}) {
  loginContainer.style.display = 'none';
  dashboardModal.style.display = 'flex';

  const name = profile.full_name || currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'User';
  welcomeText.textContent = `Welcome, ${name}`;

  accountNameElem.textContent = profile.account_name || 'Your Account';
  balanceElem.textContent = `$${Number(profile.balance ?? 0).toFixed(2)}`;

  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    transactionsTableBody.innerHTML = '';
    if (!transactions?.length) {
      transactionsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center">No transactions found</td></tr>`;
    } else {
      transactions.forEach(tx => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${new Date(tx.transaction_date).toLocaleDateString()}</td>
          <td>${tx.transaction_type || '-'}</td>
          <td>$${Number(tx.amount ?? 0).toFixed(2)}</td>
          <td>${tx.narration || '-'}</td>
        `;
        transactionsTableBody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Transactions error:', err);
    transactionsTableBody.innerHTML = `<tr><td colspan="4">Error loading transactions</td></tr>`;
  }
}

// Logout / Reset App
function resetApp() {
  supabase.auth.signOut();
  currentUser = null;
  dashboardModal.style.display = 'none';
  loginContainer.style.display = 'flex';
  loginError.textContent = '';
  loginError.classList.remove('shake');
}

// Event listeners
loginBtn.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (email && password) performLogin(email, password);
});

logoutBtn.addEventListener('click', resetApp);

// Auto login if session exists
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    await showDashboard();
  }
})();