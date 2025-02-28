const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Reception, Doctor, UsingEvent, Appointment} = require("../../models/models");
require('dotenv').config();

const moment = require('moment-timezone');

exports.login = async (req, res) => {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log(user)
    const token = jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    // Создание JWT токена
    // Устанавливаем токен в куки (httpOnly, Secure - для HTTPS)
    res.cookie('token', token, {
        httpOnly: true, // Доступен только серверу (JavaScript не может читать)
        secure: process.env.NODE_ENV === 'production', // Включаем secure в продакшене
        sameSite: 'Strict', // Улучшает безопасность
        maxAge: 24 * 60 * 60 * 1000 // 1 день
    });
    res.json({ token });
};

exports.createUsingEvent = async (req, res) => {
    try {
        const { userId, doctorId, receptionId } = req.body;

        // Проверяем, существует ли пользователь
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Проверяем, существует ли врач
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Проверяем, существует ли прием лекарства
        const reception = await Reception.findById(receptionId);
        if (!reception) {
            return res.status(404).json({ message: "Reception not found" });
        }

        // Создаем запись об использовании лекарства
        const usingEvent = new UsingEvent({
            user: userId,
            doctor: doctorId,
            reception: receptionId,
            date: moment().tz("Asia/Almaty").format("YYYY-MM-DD HH:mm")
        });

        await usingEvent.save();

        // Обновляем статус приема лекарства
        reception.recStatus = true;
        await reception.save();

        res.status(201).json({ message: "Medication usage recorded", usingEvent });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getUserRecipes = async (req, res) => {
    try {
        const userId = req.user.id; // Получаем ID пользователя из JWT

        const user = await User.findById(userId).populate({
            path: 'recipe',
            populate: [
                { path: 'doctor', select: 'fname phone speciality' },
                { path: 'reception', select: 'drug time startDay recStatus' },
                { path: 'diseaseDescription'},
                { path: 'tryComment'}
            ]
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const formattedRecipes = user.recipe.map(recipe => ({
            doctor: {
                name: recipe.doctor.fname,
                phone: recipe.doctor.phone,
                speciality: recipe.doctor.speciality
            },
            disease: recipe.disease,
            diseaseDescription: recipe.diseaseDescription,
            tryComment: recipe.tryComment,
            receptions: recipe.reception.map(reception => ({
                drug: reception.drug,
                time: reception.time,
                startDay: reception.startDay,
                expr_status: reception.expStatus
            }))
        }));

        res.status(200).json({ recipes: formattedRecipes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// 2️⃣ Получение списка всех врачей
exports.getAllDoctors = async (req, res) => {
    try {
        const userId = req.user.id;

        // Находим пользователя и загружаем его врачей
        const user = await User.findById(userId).populate('doctor', 'fname phone speciality');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            doctors: user.doctor.map(doc => ({
                name: doc.fname,
                phone: doc.phone,
                speciality: doc.speciality
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// 3️⃣ Смена пароля пользователя
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = bcrypt.compareSync(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect old password" });
        }

        user.password = bcrypt.hashSync(newPassword, 10);
        await user.save();

        res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getExpiredReceptions = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = moment().tz("Asia/Almaty");

        const user = await User.findById(userId).populate({
            path: 'recipe',
            populate: { path: 'reception', select: 'drug time startDay expStatus' }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const expiredReceptions = user.recipe.flatMap(recipe =>
            recipe.reception
                .filter(reception => moment(reception.startDay).add(reception.day, 'days').isBefore(today))
                .map(reception => ({
                    drug: reception.drug,
                    time: reception.time,
                    startDay: reception.startDay,
                    status: "Устаревший"
                }))
        );

        res.status(200).json({ expiredReceptions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.updateMedicationTimes = async (req, res) => {
    try {
        const userId = req.user.id; // Получаем ID пользователя из JWT
        const { morning, afternoon, evening } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Обновляем время приема лекарств
        user.medicationTimes = {
            morning: morning || user.medicationTimes.morning,
            afternoon: afternoon || user.medicationTimes.afternoon,
            evening: evening || user.medicationTimes.evening
        };

        await user.save();

        res.status(200).json({ message: "Medication times updated successfully", medicationTimes: user.medicationTimes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getUserAppointments = async (req, res) => {
    try {
        const userId = req.user.id;
        const currentDate = moment().tz("Asia/Almaty").toDate(); // Преобразуем в Date

        const appointments = await Appointment.find({
            user: userId,
            dateTime: { $gte: currentDate }
        })
            .populate('doctor', 'fname speciality phone')
            .sort({ dateTime: 1 }); // Сортировка по дате (ближайшие первыми)

        res.status(200).json({ appointments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getPastAppointments = async (req, res) => {
    try {
        const userId = req.user.id;
        const currentDate = moment().tz("Asia/Almaty").toDate(); // Преобразуем в Date

        const pastAppointments = await Appointment.find({
            user: userId,
            dateTime: { $lt: currentDate } // Теперь правильно находит прошедшие
        })
            .populate('doctor', 'fname speciality phone')
            .sort({ dateTime: -1 }); // Сортировка по убыванию (сначала последние посещения)

        res.status(200).json({ pastAppointments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getUserInfo = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId)
            .populate('hospital', 'name address')
            .populate('doctor', '-password') // Загружаем всех врачей, кроме пароля
            .populate({
                path: 'recipe',
                populate: [
                    { path: 'doctor', select: 'fname speciality phone' },
                    { path: 'reception', select: 'drug time day startDay expStatus' }
                ]
            })
            .select('fname phone iin hospital doctor recipe medicationTimes');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
