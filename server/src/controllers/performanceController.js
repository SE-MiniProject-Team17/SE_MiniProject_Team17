
const {
  getMyPerformance,
  getMyTopicPerformance,
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

module.exports = {
  getMine,
  getTopics,
};
