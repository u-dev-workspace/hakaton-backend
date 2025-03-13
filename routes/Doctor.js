const express = require('express');
const UserController = require('./controllers/UserController');
const DoctorController = require('./controllers/DoctorController');
const SupervisorController = require('./controllers/SupervisorController');
const authMiddleware = require('./middlewares/auth');
const roleMiddleware = require('./middlewares/role');

const router = express.Router();

router.post('/doctor/createRecipe', authMiddleware, roleMiddleware(['doctor']), DoctorController.createRecipe);

router.get('/doctor/getUpcomingAppointments', authMiddleware, roleMiddleware(['doctor']), DoctorController.getUpcomingAppointments);
router.get('/doctor/getPatientsByDoctor', authMiddleware, roleMiddleware(['doctor']), DoctorController.getPatientsByDoctor);
router.get('/doctor/getDoctorProfile', authMiddleware, roleMiddleware(['doctor']), DoctorController.getDoctorProfile);
router.get('/doctor/getDoctorAnalitics', authMiddleware, roleMiddleware(['doctor']), DoctorController.getDoctorAnalitics);
router.get('/doctor/getDoctorData', authMiddleware, roleMiddleware(['doctor']), DoctorController.getDoctorData);


module.exports = router;