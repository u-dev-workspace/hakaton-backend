const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Doctor, Supervisor, User, Appointment, Hospital} = require("../../models/models");
const moment = require("moment-timezone");
require('dotenv').config();


exports.login = async (req, res) => {
    const { name, password } = req.body;
    const supervisor = await Supervisor.findOne({ name });

    if (!supervisor || !bcrypt.compareSync(password, supervisor.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Создание JWT токена
    const token = jwt.sign({ id: supervisor._id, role: 'supervisor' }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Устанавливаем токен в куки (httpOnly, Secure - для HTTPS)
    res.cookie('token', token, {
        httpOnly: true, // Доступен только серверу (JavaScript не может читать)
        secure: process.env.NODE_ENV === 'production', // Включаем secure в продакшене
        sameSite: 'lax', // Улучшает безопасность
        maxAge: 24 * 60 * 60 * 1000 // 1 день
    });

    res.json({ message: 'Login successful', token });
};

exports.getSupervisorData = async (req, res) => {
    try {
        const supervisorId = req.user.id;

        const supervisor = await Supervisor.findById(supervisorId).populate('hospital');

        if (!supervisor) {
            return res.status(404).json({ message: "Supervisor not found" });
        }

        res.status(200).json(supervisor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.createUser = async (req, res) => {
    const { fname, phone, password, iin } = req.body;
    const hashedPassword = bcrypt.hashSync(password || '0000' , 10);
    const user = new User({ fname, phone, password: hashedPassword, iin });
    await user.save();
    res.status(201).json({ message: 'User created' });
};

exports.createDoctor = async (req, res) => {
    const { fname, phone, password, speciality } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const doctor = new Doctor({ fname, phone, password: hashedPassword, speciality });
    await doctor.save();
    res.status(201).json({ message: 'Doctor created' });
};

exports.createSupervisor = async (req, res) => {
    try {
        const { name, password, hospitalId } = req.body;

        // Проверяем, существует ли больница
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found" });
        }

        // Хешируем пароль
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Создаем супервизора и привязываем к больнице
        const supervisor = new Supervisor({ name, password: hashedPassword, hospital: hospitalId });
        await supervisor.save();

        res.status(201).json({ message: "Supervisor created successfully", supervisor });
    } catch (error) {
        console.error("Error creating supervisor:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.createHospital = async (req, res) => {
    const { name, address, gisLink } = req.body;

    const hospital = new Hospital({ name, address, gisLink });
    await hospital.save();
    res.status(201).json({ message: 'hospital created' });
};

exports.assignDoctorToHospital = async (req, res) => {
    try {
        const { userId, hospitalId } = req.body;

        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found" });
        }

        const doctor = await Doctor.findById(userId);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        doctor.hospital = hospitalId;
        hospital.doctors.push(userId);

        await doctor.save();
        await hospital.save();

        res.status(200).json({ message: "Doctor assigned to hospital successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 2️⃣ Прикрепление пациента к больнице
exports.assignPatientToHospital = async (req, res) => {
    try {
        const { userId, hospitalId } = req.body;

        // Найти больницу
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found" });
        }

        // Найти пациента
        const patient = await User.findById(userId);
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        // Проверяем, не добавлен ли уже пациент в больницу
        if (!hospital.patients.includes(userId)) {
            hospital.patients.push(userId);
        }

        // Проверяем, не добавлена ли уже больница у пациента
        if (!Array.isArray(patient.hospitals)) {
            patient.hospitals = [];
        }
        if (!patient.hospitals.includes(hospitalId)) {
            patient.hospitals.push(hospitalId);
        }

        // Сохраняем изменения
        await patient.save();
        await hospital.save();

        res.status(200).json({ message: "Patient assigned to hospital successfully" });
    } catch (error) {
        console.error("Error assigning patient to hospital:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



exports.createAppointment = async (req, res) => {
    try {
        const { doctorId, userId, dateTime } = req.body;

        // Проверяем существование врача
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Проверяем существование пациента
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 🔹 Привязываем пациента к врачу (если его там ещё нет)
        if (!doctor.users.includes(userId)) {
            doctor.users.push(userId);
        }

        // 🔹 Привязываем врача к пациенту (если его там ещё нет)
        if (!user.doctor.includes(doctorId)) {
            user.doctor.push(doctorId);
        }

        // 🔹 Форматируем дату в правильный формат
        const dateTimeISO = moment(dateTime, ["YYYY-MM-DD HH:mm", moment.ISO_8601], true).toDate();
        const dateTimeFormatted = moment(dateTimeISO).tz("Asia/Almaty").format("DD MMMM HH:mm");

        // Проверяем, что дата корректна
        if (!moment(dateTimeISO).isValid()) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        // 🔹 Создаём новую запись на приём
        const appointment = new Appointment({
            doctor: doctorId,
            user: userId,
            dateTimeISO,
            dateTimeFormatted
        });

        // 🔹 Сохраняем изменения в базе
        await user.save();
        await doctor.save();
        await appointment.save();

        res.status(201).json({ message: "Appointment created successfully", appointment });
    } catch (error) {
        console.error("Error creating appointment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getAppointmentsByHospital = async (req, res) => {
    try {
        const { hospitalId } = req.params;

        // Находим больницу и её врачей
        const hospital = await Hospital.findById(hospitalId).populate("doctors", "_id");
        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found" });
        }

        // Получаем записи только для врачей этой больницы
        const doctorIds = hospital.doctors.map(doc => doc._id);
        const appointments = await Appointment.find({ doctor: { $in: doctorIds } })
            .populate("user", "fname phone") // Заполняем данные пациента
            .populate("doctor", "fname speciality") // Заполняем данные врача
            .sort({ dateTime: 1 }); // Сортируем по дате

        if (!appointments.length) {
            return res.status(404).json({ message: "No appointments found for this hospital." });
        }

        res.status(200).json(appointments);
    } catch (error) {
        console.error("Error fetching appointments by hospital:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
