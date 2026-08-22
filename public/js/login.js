const form = document.getElementById('login-form');
const message = document.getElementById('message');
const resendSection = document.getElementById('resend-section');
const resendBtn = document.getElementById('resend-btn');

let lastEmail = '';

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  resendSection.hidden = true;
  showMessage('', '');

  lastEmail = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lastEmail, password }),
    });
    const data = await res.json();

    if (res.ok) {
      window.location.href = '/dashboard.html';
      return;
    }

    // Let the user resend if their account isn't verified yet
    if (data.code === 'UNVERIFIED') resendSection.hidden = false;

    showMessage(data.error, 'error');
    btn.disabled = false;
  } catch {
    showMessage('Network error. Please try again.', 'error');
    btn.disabled = false;
  }
});

resendBtn.addEventListener('click', async () => {
  resendBtn.disabled = true;
  try {
    await fetch('/api/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lastEmail }),
    });
    showMessage('Verification email sent — check your inbox.', 'success');
    resendSection.hidden = true;
  } catch {
    showMessage('Network error. Please try again.', 'error');
  } finally {
    resendBtn.disabled = false;
  }
});

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
  message.hidden = !text;
}
