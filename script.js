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

// ---------------- MODAL ----------------
const modal = $('modal')
const modalMsg = $('modalMessage')
const modalClose = $('modalClose')

function showModal(message) {
  modalMsg.textContent = message
  modal.style.display = 'flex'
}

function showModalHTML(html) {
  modalMsg.innerHTML = html
  modal.style.display = 'flex'
}

modalClose.onclick = () => modal.style.display = 'none'
window.onclick = e => { if (e.target === modal) modal.style.display = 'none' }

// ---------------- LOGIN LINKS ----------------
$('forgot-password').onclick = () =>
  showModal('Please visit the bank or contact support@gnlbank.online')

$('create-account').onclick = () =>
  showModal('Please visit the bank or contact support@gnlbank.online')

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

  if (error) {
    $('login-error').textContent = error.message
    return
  }

  if (data?.user) loadDashboard(data.user)
}

// ---------------- DASHBOARD ----------------
async function loadDashboard(user) {
  $('login-screen').style.display = 'none'
  $('dashboard').style.display = 'flex'

  // Enable Contact Us ONLY after login
  initContactUs()

  // Load profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, account_name, balance')
    .eq('id', user.id)
    .single()

  if (error) {
    showModal('Profile not found')
    return
  }

  $('welcome-text').textContent = profile.full_name || 'Customer'
  $('account-id').textContent = 'Account ID: ' + (profile.account_name || '12345678')

  $('balance').dataset.realBalance = profile.balance || 0
  $('balance').textContent = parseFloat(profile.balance || 0)
    .toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  // Avatar
  const avatarExtensions = ['jpg', 'jpeg', 'png', 'webp']
  let avatarSet = false

  for (const ext of avatarExtensions) {
    const path = `${user.id}.${ext}`
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const img = new Image()
    img.src = data.publicUrl
    img.onload = () => {
      if (!avatarSet) {
        $('user-avatar').src = data.publicUrl
        avatarSet = true
      }
    }
  }

  if (!avatarSet) $('user-avatar').src = 'https://i.pravatar.cc/50'

  // Transactions
  const { data: txs } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })

  $('transactions-body').innerHTML = txs?.length
    ? txs.map(tx => {
        const isNeg = parseFloat(tx.amount) < 0
        return `
        <tr>
          <td>${new Date(tx.transaction_date).toLocaleDateString()}</td>
          <td>${tx.transaction_type}</td>
          <td class="${isNeg ? 'red' : 'green'}">
            ${tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </td>
          <td>${tx.narration || ''}</td>
          <td><a href="#" class="print-link">Print Receipt</a></td>
        </tr>`
      }).join('')
    : '<tr><td colspan="5">No transactions</td></tr>'

  document.querySelectorAll('.print-link').forEach(link => {
    link.onclick = e => {
      e.preventDefault()
      showModal('Receipt unavailable. Please visit the bank or contact support@gnlbank.online')
    }
  })
}

// ---------------- BALANCE TOGGLE ----------------
$('toggleBalance').onclick = () => {
  balanceVisible = !balanceVisible
  $('balance').textContent = balanceVisible
    ? parseFloat($('balance').dataset.realBalance)
        .toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : '••••••'
}

// ---------------- FEATURE CARDS ----------------
document.querySelectorAll('.feature-card').forEach(card => {
  card.onclick = () =>
    showModal('Account is locked. Visit the bank or contact support@gnlbank.online')
})

// ---------------- CONTACT US (DASHBOARD ONLY) ----------------
function initContactUs() {
  const contactBtn = document.getElementById('contact-us-btn')
  if (!contactBtn) return

  contactBtn.style.display = 'flex'

  contactBtn.onclick = () => {
    showModalHTML(`
      <strong>Need help?</strong><br><br>
      📧 Email: 
      <a href="mailto:support@gnlbank.online">support@gnlbank.online</a><br><br>
  `)
  }
}

// ---------------- LOGOUT ----------------
$('logout-btn').onclick = async () => {
  await supabase.auth.signOut()
  location.reload()
}