// models/index.js
const mongoose = require('mongoose');
const moment = require('moment-timezone');

// User Model
const UserSchema = new mongoose.Schema({
    fname: { type: String, required: true },
    password: { type: String, required: true },
    iin: { type: String, unique: true, required: true },
    phone: { type: String, unique: true, required: true },
    recipe: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
    doctor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
    hospital: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }],
    medicationTimes: {
        morning: { type: String, required: false, default:"8am" },
        afternoon: { type: String, required: false,default:"1pm" },
        evening: { type: String, required: false, default:"8pm" }
    }
});

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
            "Медицинская сестра консультативногоотделения", "Медицинская сестра палатная (постовая) госпитальногоотделения",
            "Медицинская сестра физиотерапевтического отделения", "Медицинская сестра отделения функциональной диагностики",
            "Рентгенолаборант", "Медицинский регистратор"
        ],
        required: true
    },
    recipe: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }
});

// Reception Model
const ReceptionSchema = new mongoose.Schema({
    drug: { type: String, required: true },
    time: { type: String, required: true },
    day: { type: Number, required: true },
    startDay: {
        type: String, // Храним как строку для форматирования
        required: false,
        default: () => {
            return moment().tz("Asia/Almaty").add(1, 'day').format("YYYY-MM-DD"); // Формат Год-Месяц-День
        }
    },
    expStatus: { type: Boolean, default: false, required: false }
});

// Recipe Model
const RecipeSchema = new mongoose.Schema({
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reception: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reception' }],
    disease: { type: String, required: true },
    diseaseDescription:{type: String, required: false, default:""},
    tryComment:{type: String, required: false, default:""}
});


// Supervisor Model
const SupervisorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    password: { type: String, required: true }
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

const UsingEventSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    reception: { type: mongoose.Schema.Types.ObjectId, ref: 'Reception', required: true },
    date: {
        type: String,
        required: true,
        default: () => moment().tz("Asia/Almaty").format("YYYY-MM-DD HH:mm") // Формат YYYY-MM-DD HH:MM
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
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dateTime: {
        type: String,
        required: true,
        default: () => moment().tz("Asia/Almaty").format("DD MMMM HH:mm") // Формат 28 февраля 15:20
    }
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

