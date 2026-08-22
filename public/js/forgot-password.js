const form = document.getElementById('forgot-form');
const message = document.getElementById('message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  showMessage('', '');

  const email = document.getElementById('email').value.trim();

  try {
    const res = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    form.hidden = true;
    showMessage(data.message || data.error, res.ok ? 'success' : 'error');
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
