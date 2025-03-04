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
        sameSite: 'None', // Улучшает безопасность
        maxAge: 24 * 60 * 60 * 1000 // 1 день
    });

    res.json({ message: 'Login successful', token });
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
    const { name, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const supervisor = new Supervisor({ name, password: hashedPassword });
    await supervisor.save();
    res.status(201).json({ message: 'Supervisor created' });
};

exports.createHospital = async (req, res) => {
    const { name, address, gisLink } = req.body;

    const hospital = new Hospital({ name, address, gisLink });
    await hospital.save();
    res.status(201).json({ message: 'hospital created' });
};

exports.assignDoctorToHospital = async (req, res) => {
    try {
        const { doctorId, hospitalId } = req.body;

        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found" });
        }

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        doctor.hospital = hospitalId;
        hospital.doctors.push(doctorId);

        await doctor.save();
        await hospital.save();

        res.status(200).json({ message: "Doctor assigned to hospital successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 2️⃣ Прикрепление пациента к больнице
exports.assignUserToHospital = async (req, res) => {
    try {
        const { userId, hospitalId } = req.body;

        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.hospital = hospitalId;
        hospital.patients.push(userId);

        await user.save();
        await hospital.save();

        res.status(200).json({ message: "User assigned to hospital successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.createAppointment = async (req, res) => {
    try {
        const { doctorId, userId, dateTime } = req.body;

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Форматируем дату в нужный формат
        const formattedDateTime = moment(dateTime, "YYYY-MM-DD HH:mm").tz("Asia/Almaty").format("DD MMMM HH:mm");

        const appointment = new Appointment({
            doctor: doctorId,
            user: userId,
            dateTime: formattedDateTime
        });

        await appointment.save();

        res.status(201).json({ message: "Appointment created successfully", appointment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
