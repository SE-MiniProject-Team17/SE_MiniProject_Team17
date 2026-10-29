const {
  getMyPerformance,
  getMyTopicPerformance,
  getFacultyDashboard: getFacultyDashboardData,
} = require('../services/performanceService');

async function getMine(req, res, next) {
  try {
    const performance = await getMyPerformance(req.user.id);
    return res.status(200).json(performance);
  } catch (err) {
    return next(err);
  }
}

async function getTopics(req, res, next) {
  try {
    const performance = await getMyTopicPerformance(req.user.id);
    return res.status(200).json(performance);
  } catch (err) {
    return next(err);
  }
}

async function getFacultyDashboard(req, res, next) {
  try {
    const performance = await getFacultyDashboardData(req.user.id);
    return res.status(200).json(performance);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getMine,
  getTopics,
  getFacultyDashboard,
};
