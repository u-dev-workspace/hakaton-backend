const express = require('express');
const UserController = require('./controllers/UserController');
const DoctorController = require('./controllers/DoctorController');
const SupervisorController = require('./controllers/SupervisorController');
const GeneralController =require('./controllers/GeneralController');
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
router.post('/auth/register/user', SupervisorController.createUser);
router.post('/auth/register/doctor', SupervisorController.createDoctor);
router.post('/auth/register/supervisor', SupervisorController.createSupervisor);
router.post('/auth/check', GeneralController.checkAuth);

module.exports = router;