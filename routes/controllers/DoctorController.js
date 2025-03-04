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
    const token = jwt.sign({ id: doctor._id, role: "doctor" }, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });

    res.cookie("token", token, {
        httpOnly: true,
        secure: false, // Включить только в продакшене
        sameSite: "None", // Для работы с CORS
        path: "/",
    });

    res.status(200).json({ message: "Успешный вход", token });

};


// Функция для преобразования времени из 12-часового формата в 24-часовой (09:00, 14:00, 21:00)
const convertTo24HourFormat = (timeStr) => {
    return moment(timeStr, ["hA", "ha", "hhA", "h:mA", "h:ma", "hh:mA", "hh:ma"]).format("HH:mm");
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

        // Получаем расписание приемов у пользователя и конвертируем в 24-часовой формат
        const timeMapping = {
            morning: convertTo24HourFormat(existingUser.medicationTimes?.morning || "08:00"),
            afternoon: convertTo24HourFormat(existingUser.medicationTimes?.afternoon || "13:00"),
            evening: convertTo24HourFormat(existingUser.medicationTimes?.evening || "19:00")
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

                    if (!time || typeof time !== "string" || !time.includes(":")) {
                        return res.status(400).json({ message: `Invalid time format for ${period}: ${time}` });
                    }

                    const [hour, minute] = time.split(":").map(num => parseInt(num, 10));
                    if (isNaN(hour) || isNaN(minute)) {
                        return res.status(400).json({ message: `Invalid time values for ${period}: ${time}` });
                    }

                    let eventDateTime = moment()
                        .tz("Asia/Almaty")
                        .add(i, "days")
                        .set({ hour, minute, second: 0, millisecond: 0 });

                    if (!eventDateTime.isValid()) {
                        return res.status(400).json({ message: `Generated invalid date for ${period}` });
                    }

                    const newUsingEvent = new UsingEvent({
                        reception: newReception._id,
                        user: existingUser._id,
                        doctor: existingDoctor._id,
                        dateTime: eventDateTime.toISOString(), // ISO формат для хранения
                        timeOfDay: period,
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

