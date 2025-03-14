// models/index.js
const mongoose = require('mongoose');
const moment = require('moment-timezone');

// User Model

const getTime = (hours, minutes) => {
    const date = new Date();
    date.setUTCHours(hours, minutes, 0, 0);
    return date;
};

const UserSchema = new mongoose.Schema({
    fname: { type: String, required: true },
    password: { type: String, required: true },
    iin: {
        type: String,
        unique: true,
        required: true,
        match: /^\d{12}$/
    },
    phone: {
        type: String,
        unique: true,
        required: true,
        match: /^\+?\d{10,15}$/
    },
    recipe: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
    doctor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
    hospital: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }],
    medicationTimes: {
        morning: { type: Date, default: () => getTime(8, 0) },
        afternoon: { type: Date, default: () => getTime(13, 0) },
        evening: { type: Date, default: () => getTime(20, 0) }
    }
}, { timestamps: true });

// Виртуальные поля для отображения только времени
UserSchema.virtual('medicationTimesFormatted').get(function () {
    const formatTime = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    };

    return {
        morning: formatTime(this.medicationTimes.morning),
        afternoon: formatTime(this.medicationTimes.afternoon),
        evening: formatTime(this.medicationTimes.evening),
    };
});

// Опции для преобразования JSON (чтобы виртуальное поле включалось в `res.json()`)
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// Doctor Model
const DoctorSchema = new mongoose.Schema({
    fname: { type: String, required: true },
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    speciality: {
        type: String,
        enum: [
            "Главврач", "Врач-кардиолог", "Врач-отоларинголог", "Врач-терапевт",
            "Врач-терапевт госпитального отделения", "Врач мануальной терапии",
            "Врач-рефлексотерапевт-невролог", "Врач-психиатр", "Врач-психиатр-нарколог",
            "Врач-гематолог", "Врач-ревматолог", "Врач-офтальмолог", "Врач-уролог",
            "Врач-акушер-гинеколог", "Врач-дерматовенеролог", "Врач функциональной диагностики",
            "Фельдшер военно-врачебной комиссии", "Медицинская сестра военно-врачебной комиссии",
            "Медицинская сестра хирургического отделения", "Медицинская сестра отоларингологического отделения",
            "Медицинская сестра процедурного кабинета", "Медицинская сестра неврологического отделения",
            "Медицинская сестра кожно-венерологического отделения", "Медицинская сестра диспансерного отделения",
            "Медицинская сестра консультативного отделения", "Медицинская сестра палатная (постовая) госпитального отделения",
            "Медицинская сестра физиотерапевтического отделения", "Медицинская сестра отделения функциональной диагностики",
            "Рентгенолаборант", "Медицинский регистратор"
        ],
        required: true
    },
    recipe: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hospitals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }] // Изменено: теперь врач может быть в нескольких больницах
});


// Reception Model


// UsingEvent Schema (обновленный)
const UsingEventSchema = new mongoose.Schema({
    reception: { type: mongoose.Schema.Types.ObjectId, ref: "Reception", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    dateTime: { type: String, required: true }, // Дата и время приема
    timeOfDay: {
        type: String,
        enum: ["morning", "afternoon", "evening"], // Новое поле
        required: true
    },
    missedCount: { type: Number, default: 0, min: 0, max: 3 }, // Пропуски от 0 до 3
    isCompleted: { type: Boolean, default: false }, // Выполнен ли прием
    isExpired: {
        type: Boolean,
        default: false
    }
});

// Автообновление статуса, если пропусков 3
UsingEventSchema.pre("save", function(next) {
    if (this.missedCount >= 3) {
        this.isExpired = true;
    }
    next();
});

const ReceptionSchema = new mongoose.Schema({
    drug: { type: String, required: true }, // Название лекарства
    day: { type: Number, required: true }, // Количество дней приема
    timesPerDay: { type: Number, required: true, min: 1 }, // Количество раз в день
    usingDescription: { type: String, required: true, default:""},
    startDay: {
        type: String,
        required: true,
        default: () => moment().tz("Asia/Almaty").format("YYYY-MM-DD")
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true }
});


// Recipe ModelВ=
const RecipeSchema = new mongoose.Schema({
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reception: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reception' }],
    disease: { type: String, required: true },
    diseaseDescription:{type: String, required: false, default:""},
    tryComment:{type: String, required: false, default:""}
});

// bg-[#0000009c]


// Supervisor Model
const SupervisorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    password: { type: String, required: true },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true } // Связь с больницей
});



// Drug Model
const DrugSchema = new mongoose.Schema({
    name: {
        type: String,
        enum: [
            'Ацикловир', // Противовирусное средство
            'Амброксол', // Муколитическое средство
            'Амоксициллин', // Антибиотик
            'Атенолол', // Бета-блокатор
            'Аторвастатин', // Гиполипидемическое средство
            'Бисопролол', // Бета-блокатор
            'Валсартан', // Антигипертензивное средство
            'Габапентин', // Противоэпилептическое средство
            'Гидрохлоротиазид', // Диуретик
            'Диклофенак', // Нестероидное противовоспалительное средство
            'Доксициклин', // Антибиотик
            'Ибупрофен', // Нестероидное противовоспалительное средство
            'Кларитромицин', // Антибиотик
            'Лизиноприл', // Ингибитор АПФ
            'Лоперамид', // Противодиарейное средство
            'Метформин', // Гипогликемическое средство
            'Нифедипин', // Блокатор кальциевых каналов
            'Омепразол', // Ингибитор протонной помпы
            'Парацетамол', // Анальгетик/жаропонижающее
            'Рамиприл', // Ингибитор АПФ
            'Симвастатин', // Гиполипидемическое средство
            'Флуконазол', // Противогрибковое средство
            'Хлорамфеникол', // Антибиотик
            'Ципрофлоксацин', // Антибиотик
            'Эналаприл' // Ингибитор АПФ
            // Добавьте остальные препараты по мере необходимости
        ],
        required: true
    }
});



const HospitalSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    regNumber: { type: String, required: false, default: "" },
    patients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
    gisLink: { type: String, required:  false, default:"" },
});

const AppointmentSchema = new mongoose.Schema({
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ✅ Два формата даты
    dateTimeISO: {
        type: Date, // ISO-формат, хранится как Date
        required: true,
        default: () => moment().tz("Asia/Almaty").toDate() // Правильный формат для календаря
    },

    dateTimeFormatted: {
        type: String, // Красивый формат для UI
        required: true,
        default: () => moment().tz("Asia/Almaty").format("DD MMMM HH:mm") // Например: "21 марта 18:08"
    }
});

// ✅ Автоматическое обновление `dateTimeFormatted`, если `dateTimeISO` изменяется
AppointmentSchema.pre("save", function (next) {
    if (this.isModified("dateTimeISO")) {
        this.dateTimeFormatted = moment(this.dateTimeISO).tz("Asia/Almaty").format("DD MMMM HH:mm");
    }
    next();
});

module.exports = {
    User: mongoose.model('User', UserSchema),
    Doctor: mongoose.model('Doctor', DoctorSchema),
    Reception: mongoose.model('Reception', ReceptionSchema),
    Recipe: mongoose.model('Recipe', RecipeSchema),
    Supervisor: mongoose.model('Supervisor', SupervisorSchema),
    Drug: mongoose.model('Drug', DrugSchema),
    UsingEvent: mongoose.model('UsingEvent', UsingEventSchema),
    Hospital: mongoose.model('Hospital', HospitalSchema),
    Appointment: mongoose.model('Appointment', AppointmentSchema),
};

