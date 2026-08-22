const form = document.getElementById('signup-form');
const message = document.getElementById('message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  showMessage('', '');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (res.ok) {
      form.hidden = true;
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
