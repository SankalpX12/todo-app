const pool = require('../config/db');
const { getTier } = require('../utils/priorityTier');

async function getTasks(req, res) {
  try {
    // Exclude completed tasks from previous calendar days (FR-14)
    const result = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = $1
         AND NOT (is_completed = TRUE AND completed_at::date < CURRENT_DATE)
       ORDER BY deadline ASC`,
      [req.session.userId]
    );

    const buckets = { overdue: [], high: [], medium: [], low: [], completedToday: [] };

    for (const task of result.rows) {
      const tier = getTier(task.deadline, task.is_completed);
      const withTier = { ...task, tier };

      if (tier === 'COMPLETED') buckets.completedToday.push(withTier);
      else if (tier === 'OVERDUE')  buckets.overdue.push(withTier);
      else if (tier === 'HIGH')     buckets.high.push(withTier);
      else if (tier === 'MEDIUM')   buckets.medium.push(withTier);
      else                          buckets.low.push(withTier);
    }

    return res.status(200).json(buckets);
  } catch (err) {
    console.error('Get tasks error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function createTask(req, res) {
  const { title, deadline } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Task title is required.' });
  }
  if (!deadline) {
    return res.status(400).json({ error: 'Deadline is required.' });
  }

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    return res.status(400).json({ error: 'Invalid deadline format. Use ISO 8601.' });
  }
  if (deadlineDate <= new Date()) {
    return res.status(400).json({ error: 'Deadline must be in the future.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO tasks (user_id, title, deadline) VALUES ($1, $2, $3) RETURNING *',
      [req.session.userId, title.trim(), deadlineDate]
    );
    return res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    console.error('Create task error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function completeTask(req, res) {
  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) {
    return res.status(400).json({ error: 'Invalid task ID.' });
  }

  try {
    const found = await pool.query('SELECT id, user_id, is_completed FROM tasks WHERE id = $1', [taskId]);

    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Ownership check — never trust ID alone (NFR-4)
    if (found.rows[0].user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    if (found.rows[0].is_completed) {
      return res.status(400).json({ error: 'Task is already completed.' });
    }

    const updated = await pool.query(
      'UPDATE tasks SET is_completed = TRUE, completed_at = NOW() WHERE id = $1 RETURNING *',
      [taskId]
    );
    return res.status(200).json({ task: updated.rows[0] });
  } catch (err) {
    console.error('Complete task error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

module.exports = { getTasks, createTask, completeTask };
