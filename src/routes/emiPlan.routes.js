'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { requireStoreScope } = require('../middleware/requireStoreScope');
const validate = require('../middleware/validate');
const { updateEmiPlanValidator } = require('../validators/emiPlan.validator');
const emiPlanController = require('../controllers/emiPlan.controller');

router.use(authenticate, requireRole('STORE_OWNER', 'SUPER_ADMIN'), requireStoreScope);

router
    .route('/:id')
    .get(emiPlanController.getEmiPlan)
    .put(validate(updateEmiPlanValidator), emiPlanController.updateEmiPlan);

module.exports = router;