const express = require('express');
const UserController = require('./controllers/UserController');
const DoctorController = require('./controllers/DoctorController');
const GeneralController = require('./controllers/GeneralController');
const authMiddleware = require('./middlewares/auth');
const roleMiddleware = require('./middlewares/role');

const router = express.Router();

router.post('/general/doctor/:doctorId/:year/:month', authMiddleware, GeneralController.getDoctorAppointmentsForMonth);

router.post('/general/updateDoctorAppointments', authMiddleware, GeneralController.updateDoctorAppointments);

router.get('/general/getAllDoctors', authMiddleware, GeneralController.getAllDoctors);
router.get('/general/getAllUsers', authMiddleware, GeneralController.getAllUsers);
router.get('/general/getAllHospitals', authMiddleware, GeneralController.getAllHospitals);
router.get('/general/getAllAppointments', authMiddleware, GeneralController.getAllAppointments);

module.exports = router;