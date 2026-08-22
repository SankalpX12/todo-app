const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getTasks, createTask, completeTask } = require('../controllers/taskController');

router.use(requireAuth);

router.get('/', getTasks);
router.post('/', createTask);
router.patch('/:id/complete', completeTask);

module.exports = router;
