// Auto-refresh interval (ms)
const POLL_INTERVAL = 60_000;

(async function init() {
  const res = await fetch('/api/me');
  if (!res.ok) { window.location.href = '/login.html'; return; }

  const { email } = await res.json();
  document.getElementById('user-email').textContent = email;

  // Pre-fill date to today and time to current hour
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('task-date').min   = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  document.getElementById('task-date').value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  document.getElementById('task-time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  await fetchTasks();
  setInterval(fetchTasks, POLL_INTERVAL);
})();

// ── Add task ────────────────────────────────────────────────────────────────

document.getElementById('add-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const formError = document.getElementById('form-error');
  btn.disabled = true;
  formError.hidden = true;

  const title    = document.getElementById('task-title').value.trim();
  const dateVal  = document.getElementById('task-date').value;
  const timeVal  = document.getElementById('task-time').value;
  const deadline = new Date(`${dateVal}T${timeVal}`).toISOString();

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, deadline }),
    });
    if (res.ok) {
      e.target.reset();
      // Re-pin the date min and re-fill defaults after reset
      const n = new Date(), p = n => String(n).padStart(2, '0');
      document.getElementById('task-date').min   = `${n.getFullYear()}-${p(n.getMonth()+1)}-${p(n.getDate())}`;
      document.getElementById('task-date').value = `${n.getFullYear()}-${p(n.getMonth()+1)}-${p(n.getDate())}`;
      document.getElementById('task-time').value = `${p(n.getHours())}:${p(n.getMinutes())}`;
      await fetchTasks();
    } else {
      const data = await res.json();
      formError.textContent = data.error;
      formError.hidden = false;
    }
  } catch {
    formError.textContent = 'Network error. Please try again.';
    formError.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

// ── Logout ───────────────────────────────────────────────────────────────────

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

// ── Fetch & render ───────────────────────────────────────────────────────────

async function fetchTasks() {
  let res;
  try {
    res = await fetch('/api/tasks');
  } catch {
    showBanner('Network error loading tasks.');
    return;
  }

  if (res.status === 401) { window.location.href = '/login.html'; return; }
  if (!res.ok) { showBanner('Failed to load tasks. Will retry shortly.'); return; }

  document.getElementById('error-banner').hidden = true;

  const { overdue, high, medium, low, completedToday } = await res.json();
  renderSection(overdue,       'list-overdue',   'section-overdue',   false);
  renderSection(high,          'list-high',      'section-high',      true);
  renderSection(medium,        'list-medium',    'section-medium',    true);
  renderSection(low,           'list-low',       'section-low',       true);
  renderSection(completedToday,'list-completed', 'section-completed', true);
}

// hideWhenEmpty: hide the whole section if there are no tasks in it
function renderSection(tasks, listId, sectionId, hideWhenEmpty) {
  const section = document.getElementById(sectionId);
  const list    = document.getElementById(listId);

  section.hidden = hideWhenEmpty && tasks.length === 0;
  list.innerHTML = '';

  if (tasks.length === 0) {
    if (!hideWhenEmpty) {
      const li = document.createElement('li');
      li.className = 'task-empty';
      li.textContent = 'No overdue tasks — great work!';
      list.appendChild(li);
    }
    return;
  }

  for (const task of tasks) {
    const li = document.createElement('li');
    li.className = `task-item${task.is_completed ? ' completed' : ''}`;

    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.id      = `task-${task.id}`;
    cb.checked  = task.is_completed;
    cb.disabled = task.is_completed;

    if (!task.is_completed) {
      cb.addEventListener('change', async () => {
        cb.disabled = true;
        await markComplete(task.id);
      });
    }

    const lbl = document.createElement('label');
    lbl.htmlFor = cb.id;

    const titleEl    = document.createElement('span');
    titleEl.className = 'task-title';
    titleEl.textContent = task.title;

    const deadlineEl    = document.createElement('span');
    deadlineEl.className = 'task-deadline';
    deadlineEl.textContent = formatDeadline(task.deadline);

    lbl.appendChild(titleEl);
    lbl.appendChild(deadlineEl);
    li.appendChild(cb);
    li.appendChild(lbl);
    list.appendChild(li);
  }
}

async function markComplete(taskId) {
  try {
    const res = await fetch(`/api/tasks/${taskId}/complete`, { method: 'PATCH' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
  } catch { /* will refresh anyway */ }
  await fetchTasks();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadline(deadlineStr) {
  const diffMs   = new Date(deadlineStr) - new Date();
  const absMins  = Math.abs(Math.round(diffMs / 60_000));
  const absHrs   = Math.abs(Math.round(diffMs / 3_600_000));
  const absDays  = Math.abs(Math.round(diffMs / 86_400_000));
  const overdue  = diffMs < 0;
  const prefix   = overdue ? 'Overdue by ' : '';
  const suffix   = overdue ? '' : ' left';

  if (absMins < 60)  return `${prefix}${absMins}m${suffix}`;
  if (absHrs  < 24)  return `${prefix}${absHrs}h${suffix}`;
  return `${prefix}${absDays}d${suffix}`;
}

function showBanner(msg) {
  const el = document.getElementById('error-banner');
  el.textContent = msg;
  el.hidden = false;
}