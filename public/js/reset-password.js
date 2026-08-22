const form = document.getElementById('reset-form');
const message = document.getElementById('message');
const loginLink = document.getElementById('login-link');

const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  form.hidden = true;
  showMessage('No reset token found. Please use the link from your email.', 'error');
  loginLink.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  showMessage('', '');

  const password = document.getElementById('password').value;
  const confirm  = document.getElementById('confirm').value;

  if (password !== confirm) {
    showMessage('Passwords do not match.', 'error');
    return;
  }

  btn.disabled = true;

  try {
    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();

    if (res.ok) {
      form.hidden = true;
      loginLink.hidden = false;
      showMessage(data.message, 'success');
    } else {
      showMessage(data.error, 'error');
      btn.disabled = false;
    }
  } catch {
    showMessage('Network error. Please try again.', 'error');
    btn.disabled = false;
  }
});

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
  message.hidden = !text;
}
