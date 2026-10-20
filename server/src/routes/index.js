const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Question Bank (#13-#15)
router.use('/questions', require('./questionRoutes'));

/*
 * Each module mounts its routes here. Add ONE line for your module, e.g.
 *
 *   router.use('/auth', require('./authRoutes'));            // Accounts (#4, #5)
 *   router.use('/account', require('./accountRoutes'));      // Accounts (#6)
 *   router.use('/materials', require('./materialRoutes'));   // Materials (#7-#12)
 *   router.use('/questions', require('./questionRoutes'));   // Question Bank (#13-#15)
 *   router.use('/quizzes', require('./quizRoutes'));         // Quizzes (#16-#20)
 *   router.use('/attempts', require('./attemptRoutes'));     // Quizzes (#18-#20)
 *   router.use('/performance', require('./performanceRoutes')); // Analytics (#22-#24)
 *   router.use('/groups', require('./groupRoutes'));         // Collaboration (#25-#27)
 */

module.exports = router;
