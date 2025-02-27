const express = require('express');
const UserController = require('./controllers/UserController');
const DoctorController = require('./controllers/DoctorController');
const SupervisorController = require('./controllers/SupervisorController');
const authMiddleware = require('./middlewares/auth');
const roleMiddleware = require('./middlewares/role');

const router = express.Router();

// User Login
router.post('/auth/login/user', UserController.login);
// Doctor Login
router.post('/auth/login/doctor', DoctorController.login);
// Supervisor Login
router.post('/auth/login/supervisor', SupervisorController.login);

// Supervisor Registering Users
router.post('/auth/register/user', authMiddleware, roleMiddleware(['supervisor']), SupervisorController.createUser);
router.post('/auth/register/doctor', authMiddleware, roleMiddleware(['supervisor']), SupervisorController.createDoctor);
router.post('/auth/register/supervisor', SupervisorController.createSupervisor);

module.exports = router;