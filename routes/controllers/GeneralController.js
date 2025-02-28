const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Doctor, Supervisor, User, Appointment, Hospital} = require("../../models/models");
const moment = require("moment-timezone");
require('dotenv').config();


exports.getDoctorAppointmentsForMonth = async (req, res) => {
    try {
        const { doctorId, year, month } = req.params;

        const startOfMonth = moment.tz({ year, month: month - 1, day: 1 }, "Asia/Almaty").startOf('month');
        const endOfMonth = moment(startOfMonth).endOf('month');

        const appointments = await Appointment.find({
            doctor: doctorId
        }).populate('user', 'fname phone');

        // Фильтруем только записи, попадающие в этот месяц
        const filteredAppointments = appointments.filter(app => {
            const appointmentDate = moment(app.dateTime, "DD MMMM HH:mm").tz("Asia/Almaty");
            return appointmentDate.isBetween(startOfMonth, endOfMonth, null, '[]');
        });

        res.status(200).json({ appointments: filteredAppointments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// 3️⃣ Автоматическое обновление расписания каждый месяц с сохранением последних 2 месяцев
exports.updateDoctorAppointments = async () => {
    try {
        const currentDate = moment().tz("Asia/Almaty");
        const twoMonthsAgo = moment(currentDate).subtract(1, 'months').startOf('month');

        // Удаляем записи старше 2 месяцев
        await Appointment.deleteMany({
            dateTime: { $lt: twoMonthsAgo.format("DD MMMM HH:mm") }
        });

        console.log("Old appointments deleted, schedule updated.");
    } catch (error) {
        console.error("Error updating doctor appointments:", error);
    }
};
