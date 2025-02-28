const express = require('express');
const UserController = require('./controllers/UserController');
const DoctorController = require('./controllers/DoctorController');
const SupervisorController = require('./controllers/SupervisorController');
const authMiddleware = require('./middlewares/auth');
const roleMiddleware = require('./middlewares/role');

const router = express.Router();

router.post('/doctor/createRecipe', authMiddleware, roleMiddleware(['doctor']), DoctorController.createRecipe);

router.post('/doctor/getUpcomingAppointments', authMiddleware, roleMiddleware(['doctor']), DoctorController.getUpcomingAppointments);


module.exports = router;