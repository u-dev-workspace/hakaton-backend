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


router.post('/user/getUserAppointments', authMiddleware,roleMiddleware(['user']), UserController.getUserAppointments); // Новый маршрут

router.post('/user/getPastAppointments', authMiddleware,roleMiddleware(['user']), UserController.getPastAppointments); // Новый маршрут

router.post('/user/getUserInfo', authMiddleware,roleMiddleware(['user']), UserController.getUserInfo); // Новый маршрут
router.post('/user/updateUsingEvent/:eventId', authMiddleware,roleMiddleware(['user']), UserController.updateUsingEvent );
router.post('/user/getUsingEventsByMonth/:userId', authMiddleware, UserController.getUsingEventsByMonth );
router.post('/user/getUsingEventsForToday', authMiddleware, UserController.getUsingEventsForToday );

module.exports = router;

