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

exports.getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find()
            .populate("users") // Получаем пациентов врача
            .populate("hospital") // Получаем данные о больнице
            .populate("recipe"); // Получаем рецепты, назначенные врачом

        if (!doctors.length) {
            return res.status(404).json({ message: "No doctors found." });
        }

        res.status(200).json(doctors);
    } catch (error) {
        console.error("Error fetching doctors:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .populate("recipe") // Получаем рецепты пользователя
            .populate("doctor") // Получаем лечащих врачей
            .populate("hospital"); // Получаем больницы, в которых лечится пациент

        if (!users.length) {
            return res.status(404).json({ message: "No users found." });
        }

        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getAllHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find()
            .populate("patients") // Получаем всех пациентов
            .populate("doctors"); // Получаем всех врачей

        if (!hospitals.length) {
            return res.status(404).json({ message: "No hospitals found." });
        }

        res.status(200).json(hospitals);
    } catch (error) {
        console.error("Error fetching hospitals:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getAllAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate("doctor") // Подтягиваем данные врача
            .populate("user"); // Подтягиваем данные пациента

        if (!appointments.length) {
            return res.status(404).json({ message: "No appointments found." });
        }

        res.status(200).json(appointments);
    } catch (error) {
        console.error("Error fetching appointments:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.checkAuth = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1]; // Достаем сам токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Декодируем токен

        // Проверяем, существует ли пользователь
        let user = await User.findById(decoded.id) ||
            await Doctor.findById(decoded.id) ||
            await Supervisor.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        res.json({ isAuthenticated: true, user });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};
