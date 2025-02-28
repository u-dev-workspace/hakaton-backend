const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Doctor, Recipe, Reception, User } = require("../../models/models");
require('dotenv').config();

exports.login = async (req, res) => {
    const { phone, password } = req.body;
    const doctor = await Doctor.findOne({ phone });
    if (!doctor || !bcrypt.compareSync(password, doctor.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Создание JWT токена
    const token = jwt.sign({ id: doctor._id, role: 'doctor' }, process.env.JWT_SECRET, { expiresIn: '3d' });
    // Устанавливаем токен в куки (httpOnly, Secure - для HTTPS)
    res.cookie('token', token, {
        httpOnly: true, // Доступен только серверу (JavaScript не может читать)
        secure: process.env.NODE_ENV === 'production', // Включаем secure в продакшене
        sameSite: 'Strict', // Улучшает безопасность
        maxAge: 24 * 60 * 60 * 1000 // 1 день
    });
    res.json({ token });
};

exports.createRecipe = async (req, res) => {
    try {
        const { user, receptions, disease, diseaseDescription, tryComment} = req.body;
        const doctorId = req.user.id; // ID врача из JWT

        // Проверяем, существует ли пользователь
        const existingUser = await User.findById(user);
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Проверяем, существует ли врач
        const existingDoctor = await Doctor.findById(doctorId);
        if (!existingDoctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Создаём записи в коллекции Reception
        const createdReceptions = await Reception.insertMany(receptions);

        // Создаём рецепт
        const recipe = new Recipe({
            doctor: doctorId,
            user: existingUser._id,
            reception: createdReceptions.map(rec => rec._id),
            disease,
            diseaseDescription,
            tryComment
        });

        await recipe.save();

        // Добавляем рецепт пользователю и врачу
        existingUser.recipe.push(recipe._id);
        existingDoctor.recipe.push(recipe._id);

        // Добавляем врача в список врачей пациента
        if (!existingUser.doctor.includes(doctorId)) {
            existingUser.doctor.push(doctorId);
        }

        // Добавляем пользователя в список пациентов врача, если его там нет
        if (!existingDoctor.users.includes(existingUser._id)) {
            existingDoctor.users.push(existingUser._id);
        }

        await existingUser.save();
        await existingDoctor.save();

        res.status(201).json({ message: "Recipe created successfully", recipe });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
