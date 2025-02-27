const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Doctor, Supervisor, User } = require("../../models/models");
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
        sameSite: 'Strict', // Улучшает безопасность
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
