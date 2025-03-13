const express = require('express');
const UserController = require('./controllers/UserController');
const DoctorController = require('./controllers/DoctorController');
const GeneralController = require('./controllers/GeneralController');
const authMiddleware = require('./middlewares/auth');
const roleMiddleware = require('./middlewares/role');

const router = express.Router();

router.post('/general/doctor/:doctorId/:year/:month', authMiddleware, GeneralController.getDoctorAppointmentsForMonth);

router.post('/general/updateDoctorAppointments', authMiddleware, GeneralController.updateDoctorAppointments);

router.get('/general/getAllDoctors', GeneralController.getAllDoctors);
router.get('/general/getAllUsers', GeneralController.getAllUsers);
router.get('/general/getAllHospitals', GeneralController.getAllHospitals);
router.get('/general/getAllAppointments', GeneralController.getAllAppointments);

router.get('/general/doctors/:hospitalId', GeneralController.getDoctorsByHospital);
router.get('/general/users/:hospitalId', GeneralController.getUsersByHospital);
router.get('/general/hospital/:hospitalId', GeneralController.getHospitalWithDetails);

module.exports = router;