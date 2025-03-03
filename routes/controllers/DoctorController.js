const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Doctor, Recipe, Reception, User, Appointment, UsingEvent} = require("../../models/models");
const moment = require("moment-timezone");
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
        const { user, receptions, disease, diseaseDescription, tryComment } = req.body;
        const doctorId = req.user.id;

        const existingUser = await User.findById(user);
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const existingDoctor = await Doctor.findById(doctorId);
        if (!existingDoctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Получаем расписание приемов у пользователя
        const timeMapping = {
            morning: existingUser.medicationTimes.morning,
            afternoon: existingUser.medicationTimes.afternoon,
            evening: existingUser.medicationTimes.evening
        };

        let createdReceptions = [];
        let createdUsingEvents = [];

        for (const receptionData of receptions) {
            const { drug, day, timesPerDay } = receptionData;

            if (timesPerDay < 1 || timesPerDay > 3) {
                return res.status(400).json({ message: "Invalid timesPerDay value. Must be between 1 and 3." });
            }

            const newReception = new Reception({
                drug,
                day,
                timesPerDay,
                user: existingUser._id,
                doctor: existingDoctor._id,
                startDay: moment().tz("Asia/Almaty").format("YYYY-MM-DD")
            });

            await newReception.save();
            createdReceptions.push(newReception._id);

            // Выбираем нужное количество временных слотов
            const selectedTimes = Object.keys(timeMapping).slice(0, timesPerDay);

            for (let i = 0; i < day; i++) {
                for (const period of selectedTimes) {
                    const time = timeMapping[period];

                    let eventDateTime = moment()
                        .tz("Asia/Almaty")
                        .add(i, "days")
                        .set({
                            hour: parseInt(time.split(":")[0]),
                            minute: parseInt(time.split(":")[1]) || 0
                        })
                        .format("YYYY-MM-DD HH:mm");

                    const newUsingEvent = new UsingEvent({
                        reception: newReception._id,
                        user: existingUser._id,
                        doctor: existingDoctor._id,
                        dateTime: eventDateTime,
                        timeOfDay: period, // Добавляем новый параметр
                        missedCount: 0,
                        isCompleted: false,
                        isExpired: false
                    });

                    await newUsingEvent.save();
                    createdUsingEvents.push(newUsingEvent._id);
                }
            }
        }

        const recipe = new Recipe({
            doctor: doctorId,
            user: existingUser._id,
            reception: createdReceptions,
            disease,
            diseaseDescription,
            tryComment
        });

        await recipe.save();

        existingUser.recipe.push(recipe._id);
        existingDoctor.recipe.push(recipe._id);

        if (!existingUser.doctor.includes(doctorId)) {
            existingUser.doctor.push(doctorId);
        }

        if (!existingDoctor.users.includes(existingUser._id)) {
            existingDoctor.users.push(existingUser._id);
        }

        await existingUser.save();
        await existingDoctor.save();

        res.status(201).json({
            message: "Recipe created successfully",
            recipe,
            createdReceptions,
            createdUsingEvents
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};



exports.getUpcomingAppointments = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const currentDate = moment().tz("Asia/Almaty").toDate(); // Преобразуем в Date

        const appointments = await Appointment.find({
            doctor: doctorId
        })
            .populate('user', 'fname phone')
            .sort({ dateTime: 1 }); // Сортировка по дате (ближайшие первыми)

        res.status(200).json({ appointments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};



// 2️⃣ Получение всех записей пациента с данными о врачах, отсортированных по дате

