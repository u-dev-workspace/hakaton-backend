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
        sameSite: "lax", // Для работы с CORS
        path: "/",
    });

    res.status(200).json({ message: "Успешный вход", token });

};

exports.getPatientsByDoctor = async (req, res) => {
    try {
        const doctorId = req.user.id; // ID врача из токена

        // Находим врача и загружаем список пациентов
        const doctor = await Doctor.findById(doctorId).populate("users", "fname phone iin");

        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        if (!doctor.users || doctor.users.length === 0) {
            return res.status(404).json({ message: "No patients found for this doctor." });
        }

        res.status(200).json(doctor.users);
    } catch (error) {
        console.error("Error fetching patients by doctor:", error);
        res.status(500).json({ message: "Internal server error" });
    }
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
            const { drug, day, timesPerDay, usingDescription } = receptionData;

            console.log(receptionData)
            if (timesPerDay < 1 || timesPerDay > 3) {
                return res.status(400).json({ message: "Invalid timesPerDay value. Must be between 1 and 3." });
            }

            const newReception = new Reception({
                drug,
                day,
                timesPerDay,
                usingDescription,
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

        // 🔹 Добавляем форматированную дату в каждый объект
        const formattedAppointments = appointments.map(appointment => ({
            ...appointment._doc, // Оставляем оригинальные данные
            formattedDateTime: moment(appointment.dateTime)
                .tz("Asia/Almaty")
                .format("DD MMMM YYYY, HH:mm") // Например: "21 марта 2025, 18:08"
        }));

        res.status(200).json({ appointments: formattedAppointments });
    } catch (error) {
        console.error("Ошибка получения записей:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getDoctorProfile = async (req, res) => {
    try {
        // 🔹 Получаем `doctorId` из запроса (из параметра или токена)
        const doctorId = req.user.id;

        // 🔹 Находим врача и заполняем его связи
        const doctor = await Doctor.findById(doctorId)
            .populate("users", "fname lname phone iin") // Добавляем пациентов врача
            .populate("hospital", "name address") // Добавляем больницу
            .populate("recipe"); // Добавляем рецепты врача

        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // 🔹 Получаем записи на приём к врачу
        const appointments = await Appointment.find({ doctor: doctorId })
            .populate("user", "fname lname phone") // Заполняем данные пациента
            .sort({ dateTimeISO: 1 }); // Сортируем по дате

        // 🔹 Формируем ответ
        const doctorProfile = {
            _id: doctor._id,
            fname: doctor.fname,
            lname: doctor.lname,
            phone: doctor.phone,
            speciality: doctor.speciality,
            hospital: doctor.hospital || null,
            users: doctor.users || [],
            appointments: appointments || [],
            recipes: doctor.recipe || [],
        };

        res.status(200).json(doctorProfile);
    } catch (error) {
        console.error("Ошибка при получении данных о враче:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const calculateScore = async (userId) => {
    const events = await UsingEvent.find({ user: userId });
    const recipes = await Recipe.find({ user: userId });

    const totalEvents = events.length;
    const missedEvents = events.filter(e => e.missedCount > 0).length;
    const activeRecipes = recipes.filter(r => r.reception.length > 0).length;
    const completedRecipes = recipes.length - activeRecipes;

    if (totalEvents === 0) return 0; // Если нет приемов, рейтинг 0

    // Формула для оценки (чем меньше пропусков, тем выше рейтинг)
    let score = 10 - (missedEvents / totalEvents) * 10;
    score += (activeRecipes * 1) - (completedRecipes * 0.5);
    return Math.max(0, Math.min(10, score)); // Ограничиваем 0-10
};

exports.getDoctorAnalitics = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const doctor = await Doctor.findById(doctorId).populate('users');
        if (!doctor) return res.status(404).json({ error: 'Доктор не найден' });

        const statistics = await Promise.all(doctor.users.map(async (user) => {
            const score = await calculateScore(user._id);
            return { userId: user._id, name: user.fname, score };
        }));

        res.json(statistics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDoctorData = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const doctor = await Doctor.findById(doctorId).populate('users hospitals recipe');
        if (!doctor) return res.status(404).json({ error: 'Доктор не найден' });

        res.json({
            doctorId: doctor._id,
            name: doctor.fname,
            phone: doctor.phone,
            speciality: doctor.speciality,
            hospitals: doctor.hospitals.map(hospital => ({ id: hospital._id, name: hospital.name })),
            patients: doctor.users.map(user => ({ id: user._id, name: user.fname })),
            recipes: doctor.recipe.map(recipe => ({ id: recipe._id, disease: recipe.disease }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2️⃣ Получение всех записей пациента с данными о врачах, отсортированных по дате

