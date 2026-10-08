'use strict';

const router = require('express').Router();
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { loginValidator } = require('../validators/auth.validator');
const authController = require('../controllers/auth.controller');

router.post(
    '/login',
    validate(loginValidator, 'AUTHENTICATION_FAILED'),
    authController.login
);
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);

module.exports = router;