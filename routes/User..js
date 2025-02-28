const express = require('express');
const UserController = require('./controllers/UserController');
const DoctorController = require('./controllers/DoctorController');
const SupervisorController = require('./controllers/SupervisorController');
const authMiddleware = require('./middlewares/auth');
const roleMiddleware = require('./middlewares/role');

const router = express.Router();

router.post('/user/use', authMiddleware, roleMiddleware(['user']), UserController.createUsingEvent);
router.post('/user/recipes', authMiddleware, roleMiddleware(['user']), UserController.getUserRecipes);
router.post('/user/doctors', authMiddleware, roleMiddleware(['user']), UserController.getAllDoctors);
router.post('/user/change-password', authMiddleware, roleMiddleware(['user']), UserController.changePassword);
router.post('/user/expired-receptions', authMiddleware,roleMiddleware(['user']), UserController.getExpiredReceptions); // Новый маршрут
router.post('/user/updateMedicationTimes', authMiddleware,roleMiddleware(['user']), UserController.updateMedicationTimes); // Новый маршрут

module.exports = router;

