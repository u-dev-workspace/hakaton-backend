const express = require('express');
const UserController = require('./controllers/UserController');
const DoctorController = require('./controllers/DoctorController');
const SupervisorController = require('./controllers/SupervisorController');
const authMiddleware = require('./middlewares/auth');
const roleMiddleware = require('./middlewares/role');

const router = express.Router();

router.post('/admin/addAppointment', authMiddleware, SupervisorController.createAppointment);
// router.post('/auth/register/doctor', authMiddleware, roleMiddleware(['supervisor']), SupervisorController.createDoctor);

router.post('/admin/addHospital', authMiddleware, roleMiddleware(['supervisor']), SupervisorController.createHospital);
router.post('/admin/addUserToHospital',authMiddleware,roleMiddleware(['supervisor']), SupervisorController.assignPatientToHospital);

router.post('/admin/addDoctorToHospital',authMiddleware,roleMiddleware(['supervisor']), SupervisorController.assignDoctorToHospital);
router.get('/admin/getSupervisorData',authMiddleware,roleMiddleware(['supervisor']), SupervisorController.getSupervisorData);
router.get('/appointments/hospital/:hospitalId',authMiddleware,roleMiddleware(['supervisor']), SupervisorController.getAppointmentsByHospital);

module.exports = router;