function getTier(deadline, isCompleted) {
  if (isCompleted) return 'COMPLETED';
  const hoursRemaining = (new Date(deadline) - new Date()) / (1000 * 60 * 60);
  if (hoursRemaining < 0) return 'OVERDUE';
  if (hoursRemaining < 24) return 'HIGH';
  if (hoursRemaining <= 72) return 'MEDIUM';
  return 'LOW';
}

module.exports = { getTier };
