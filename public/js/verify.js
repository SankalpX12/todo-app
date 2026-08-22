const statusEl = document.getElementById('status-message');
const resendSection = document.getElementById('resend-section');
const loginLink = document.getElementById('login-link');
const resendForm = document.getElementById('resend-form');

const token = new URLSearchParams(window.location.search).get('token');

(async function verifyToken() {
  if (!token) {
    showStatus('No verification token found. Please use the link from your email.', 'error');
    loginLink.hidden = false;
    return;
  }

  try {
    const res = await fetch(`/api/verify/${encodeURIComponent(token)}`);
    const data = await res.json();

    if (res.ok) {
      showStatus(data.message, 'success');
      loginLink.hidden = false;
    } else if (data.code === 'TOKEN_EXPIRED') {
      showStatus(data.error, 'error');
      resendSection.hidden = false;
    } else {
      showStatus(data.error, 'error');
      loginLink.hidden = false;
    }
  } catch {
    showStatus('Network error. Please try again.', 'error');
  }
})();

resendForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = resendForm.querySelector('button[type="submit"]');
  btn.disabled = true;

  const email = document.getElementById('resend-email').value.trim();

  try {
    await fetch('/api/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    resendSection.hidden = true;
    showStatus('Verification email sent — check your inbox.', 'success');
    loginLink.hidden = false;
  } catch {
    showStatus('Network error. Please try again.', 'error');
    btn.disabled = false;
  }
});

function showStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = `message ${type}`;
}
