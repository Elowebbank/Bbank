// ---------------- SUPABASE ----------------
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://saeufvynqmqcatlseedb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZXVmdnlucW1xY2F0bHNlZWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTg3MDYsImV4cCI6MjA4NTg5NDcwNn0.zYEb_smm9YGH4fRnfsMJcjZo00lFbkdBBsF1XdL3FaE'
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

// ---------------- CINEMATIC MODAL ----------------
const modal = $('modal')
const modalMsg = $('modalMessage')
const modalClose = $('modalClose')

function showModal(message, type = 'info') {
  modalMsg.innerHTML = message
  modal.className = `modal cinematic ${type}` // cinematic theme: info | alert | warning | error | locked
  modal.style.display = 'flex'
}

modalClose.onclick = () => modal.style.display = 'none'
window.onclick = e => { if (e.target === modal) modal.style.display = 'none' }

// ---------------- LOGIN LINKS ----------------
$('forgot-password').onclick = () =>
  showModal(
    'Forgot your password? 📧 <strong>support@fundfort.online</strong> is ready to assist you securely.',
    'alert'
  )

$('create-account').onclick = () =>
  showModal(
    'Want to join FundFort? Contact 📧 <strong>support@fundfort.online</strong> or visit a branch for verification.',
    'alert'
  )

// ---------------- LOGIN ----------------
$('login-btn').onclick = async () => {
  $('login-error').textContent = ''
  spinner.style.display = 'inline-block'

  const email = $('email').value.trim()
  const password = $('password').value.trim()

  if (!email || !password) {
    spinner.style.display = 'none'
    $('login-error').textContent = 'Email and password are required.'
    return
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  spinner.style.display = 'none'

  if (error) {
    showModal(
      '⚠️ Login failed. Your account may be temporarily locked. Contact 📧 <strong>support@fundfort.online</strong> for immediate assistance.',
      'error'
    )
    return
  }

  if (data?.user) loadDashboard(data.user)
}

// ---------------- DASHBOARD ----------------
async function loadDashboard(user) {
  $('login-screen').style.display = 'none'
  $('dashboard').style.display = 'flex'

  // --- Load Profile ---
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, account_name, balance')
    .eq('id', user.id)
    .single()

  if (profileError) {
    showModal('Profile not found. Contact 📧 <strong>support@fundfort.online</strong>.', 'error')
    return
  }

  $('welcome-text').textContent = profile.full_name || 'Customer'
  $('account-id').textContent = 'Account ID: ' + (profile.account_name || '12345678')

  $('balance').dataset.realBalance = profile.balance || 0
  $('balance').textContent = formatCurrency(profile.balance || 0)

  // --- Load Avatar ---
  const avatarExtensions = ['jpg', 'jpeg', 'png', 'webp']
  let avatarSet = false

  for (const ext of avatarExtensions) {
    const path = `${user.id}.${ext}`
    const { data: avatarData } = supabase.storage.from('avatars').getPublicUrl(path)
    const img = new Image()
    img.src = avatarData.publicUrl
    img.onload = () => {
      if (!avatarSet) {
        $('user-avatar').src = avatarData.publicUrl
        avatarSet = true
      }
    }
  }
  if (!avatarSet) $('user-avatar').src = ''

  // --- Load Transactions ---
  const { data: txs } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })

  $('transactions-body').innerHTML = txs?.length
    ? txs.map(tx => {
        const isNeg = parseFloat(tx.amount) < 0
        return `
        <tr class="tx-row ${isNeg ? 'debit' : 'credit'}">
          <td>${new Date(tx.transaction_date).toLocaleDateString()}</td>
          <td>${tx.transaction_type}</td>
          <td class="${isNeg ? 'red' : 'green'}">${formatCurrency(tx.amount)}</td>
          <td>${tx.narration || ''}</td>
          <td><a href="#" class="print-link">Print Receipt</a></td>
        </tr>`
      }).join('')
    : '<tr><td colspan="5">No transactions yet. For support, contact 📧 <strong>support@fundfort.online</strong></td></tr>'

  // --- Print Receipt ---
  document.querySelectorAll('.print-link').forEach(link => {
    link.onclick = e => {
      e.preventDefault()
      showModal(
        'Receipt not available online. Kindly visit a branch or contact 📧 <strong>support@fundfort.online</strong>.',
        'warning'
      )
    }
  })
}

// ---------------- BALANCE TOGGLE ----------------
$('toggleBalance').onclick = () => {
  balanceVisible = !balanceVisible
  $('balance').textContent = balanceVisible
    ? formatCurrency($('balance').dataset.realBalance)
    : '••••••'
}

// ---------------- FEATURE CARDS ----------------
document.querySelectorAll('.feature-card').forEach(card => {
  card.onclick = () =>
    showModal(
      '🚫 Feature Locked: Contact 📧 <strong>support@fundfort.online</strong> for immediate access.',
      'locked'
    )
})

// ---------------- LOGOUT ----------------
$('logout-btn').onclick = async () => {
  await supabase.auth.signOut()
  location.reload()
}

// ---------------- HELPERS ----------------
function formatCurrency(amount) {
  return parseFloat(amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}