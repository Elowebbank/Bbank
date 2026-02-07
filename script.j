// ---------------- SUPABASE ----------------
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://saeufvynqmqcatlseedb.supabase.co', // Replace with your Supabase URL
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZXVmdnlucW1xY2F0bHNlZWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTg3MDYsImV4cCI6MjA4NTg5NDcwNn0.zYEb_smm9YGH4fRnfsMJcjZo00lFbkdBBsF1XdL3FaE' // Replace with your anon key
)

// ---------------- HELPERS ----------------
const $ = id => document.getElementById(id)
let balanceVisible = true
const spinner = $('spinner')

// ---------------- PASSWORD TOGGLE ----------------
$('togglePassword').onclick = () => {
  const pw = $('password')
  pw.type = pw.type === 'password' ? 'text' : 'password'
}

// ---------------- MODAL ----------------
const modal = $('modal')
const modalMsg = $('modalMessage')
const modalClose = $('modalClose')

function showModal(msg) {
  modalMsg.textContent = msg
  modal.style.display = 'flex'
}
modalClose.onclick = () => modal.style.display = 'none'
window.onclick = e => { if (e.target === modal) modal.style.display = 'none' }

// ---------------- LOGIN LINKS ----------------
$('forgot-password').onclick = () => showModal("Please visit the bank or contact support@gnlbank.online")
$('create-account').onclick = () => showModal("Please visit the bank or contact support@gnlbank.online")

// ---------------- LOGIN ----------------
$('login-btn').onclick = async () => {
  $('login-error').textContent = ''
  spinner.style.display = 'inline-block'

  const email = $('email').value.trim()
  const password = $('password').value.trim()

  if (!email || !password) {
    spinner.style.display = 'none'
    $('login-error').textContent = 'Email & password required'
    return
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  spinner.style.display = 'none'

  if (error) { $('login-error').textContent = error.message; return }
  if (data?.user) loadDashboard(data.user)
}

// ---------------- DASHBOARD ----------------
async function loadDashboard(user) {
  $('login-screen').style.display = 'none'
  $('dashboard').style.display = 'flex'

  // Load profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, account_name, balance')
    .eq('id', user.id)
    .single()

  if (error) { showModal('Profile not found'); return }

  $('welcome-text').textContent = profile.full_name || 'Customer'
  $('account-id').textContent = 'Account ID: ' + (profile.account_name || '12345678')
  $('balance').dataset.realBalance = profile.balance || 0
  $('balance').textContent = balanceVisible
    ? parseFloat(profile.balance || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : '••••••'

  // Load avatar from Storage
  const avatarExtensions = ['jpg', 'jpeg', 'png', 'webp']
  let avatarSet = false
  for (const ext of avatarExtensions) {
    const filePath = `${user.id}.${ext}`
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const img = new Image()
    img.src = data.publicUrl
    img.onload = () => { if (!avatarSet) { $('user-avatar').src = data.publicUrl; avatarSet = true } }
  }
  if (!avatarSet) { $('user-avatar').src = 'https://i.pravatar.cc/50' }

  // Load transactions
  const { data: txs } = await supabase.from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })

  $('transactions-body').innerHTML = txs?.length
    ? txs.map(tx => {
        const isNegative = parseFloat(tx.amount) < 0
        const colorClass = isNegative ? 'red' : 'green'
        return `<tr>
          <td>${new Date(tx.transaction_date).toLocaleDateString()}</td>
          <td>${tx.transaction_type}</td>
          <td class="${colorClass}">${(tx.amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
          <td>${tx.narration || ''}</td>
          <td><a href="#" class="print-link" data-id="${tx.id}">Print Receipt</a></td>
        </tr>`
      }).join('')
    : '<tr><td colspan="5">No transactions</td></tr>'

  // Add print link click
  document.querySelectorAll('.print-link').forEach(link => {
    link.onclick = e => {
      e.preventDefault()
      showModal("Cannot print receipt. Please visit the bank or contact support@gnlbank.online")
    }
  })
}

// ---------------- BALANCE TOGGLE ----------------
$('toggleBalance').onclick = () => {
  balanceVisible = !balanceVisible
  $('balance').textContent = balanceVisible
    ? parseFloat($('balance').dataset.realBalance).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : '••••••'
}

// ---------------- FEATURE CARDS ----------------
document.querySelectorAll('.feature-card').forEach(card => {
  card.onclick = () => showModal("Account is locked. Unlock via bank visit or contact support@gnlbank.online")
})

// ---------------- LOGOUT ----------------
$('logout-btn').onclick = async () => {
  await supabase.auth.signOut()
  location.reload()
}

// ---------------- AUTO LOGIN ----------------
supabase.auth.getSession().then(({ data }) => {
  if (data?.session?.user) loadDashboard(data.session.user)
})