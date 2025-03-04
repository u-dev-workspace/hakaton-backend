const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Doctor, Supervisor, User, Appointment, Hospital, Drug} = require("../../models/models");
const moment = require("moment-timezone");
require('dotenv').config();


exports.searchDoctor = async (req, res) => {
    try {
        console.log("Raw query:", req.params.query);
        const query = decodeURIComponent(req.params.query);
        console.log("Decoded query:", query);

        if (!query || query.trim() === '') {
            return res.status(400).json({ message: "Search query cannot be empty" });
        }

        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Экранирование спецсимволов
        const doctors = await Doctor.find({
            $or: [
                { fname: { $regex: safeQuery, $options: 'i' } },
                { speciality: { $regex: safeQuery, $options: 'i' } },
                { phone: { $regex: safeQuery, $options: 'i' } }
            ]
        }).limit(7);

        console.log("Found doctors:", doctors);

        res.status(200).json({ doctors });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// 2️⃣ Поиск пациента по номеру телефона, ИИН или имени
exports.searchUser = async (req, res) => {
    try {
        const { query } = req.params;
        if (!query || query.trim() === '') {
            return res.status(400).json({ message: "Search query cannot be empty" });
        }
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Экранирование спецсимволов
        const users = await User.find({
            $or: [
                { phone: { $regex: safeQuery, $options: 'i' } },
                { iin: { $regex: safeQuery, $options: 'i' } },
                { fname: { $regex: safeQuery, $options: 'i' } }
            ]
        }).limit(7);

        res.status(200).json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 3️⃣ Поиск больницы по названию
exports.searchHospital = async (req, res) => {
    try {
        const query = decodeURIComponent(req.params.query);
        if (!query || query.trim() === '') {
            return res.status(400).json({ message: "Search query cannot be empty" });
        }
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Экранирование спецсимволов
        const hospitals = await Hospital.find({
            name: { $regex: safeQuery, $options: 'i' }
        }).limit(7);

        res.status(200).json({ hospitals });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
const specialities = [
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
];

exports.searchSpeciality = async (req, res) => {
    try {
        const { query } = req.params;
        if (!query || query.trim() === '') {
            return res.status(400).json({ message: "Search query cannot be empty" });
        }
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const filteredSpecialities = specialities.filter(s => s.toLowerCase().includes(safeQuery.toLowerCase())).slice(0, 7);

        res.status(200).json({ specialities: filteredSpecialities });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.searchDrug = async (req, res) => {
    try {
        await checkAndAddDrugs()
        const { query } = req.params;
        if (!query || query.trim() === '') {
            return res.status(400).json({ message: "Search query cannot be empty" });
        }
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const drugs = await Drug.find({ name: { $regex: safeQuery, $options: 'i' } }).limit(7);

        res.status(200).json({ drugs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 2️⃣ Добавление лекарства, если его нет в списке
exports.addDrugIfNotExists = async (req, res) => {
    try {
        let { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: "Drug name cannot be empty" });
        }

        // Делаем первую букву заглавной
        name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

        let existingDrug = await Drug.findOne({ name });
        if (existingDrug) {
            return res.status(200).json({ message: "Drug already exists", drug: existingDrug });
        }

        // Создаем новое лекарство
        const newDrug = new Drug({ name });
        await newDrug.save();

        res.status(201).json({ message: "Drug added successfully", drug: newDrug });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
const drugList = [
    "Ацикловир", "Амброксол", "Амоксициллин", "Атенолол", "Аторвастатин",
    "Бисопролол", "Валсартан", "Габапентин", "Гидрохлоротиазид", "Диклофенак",
    "Доксициклин", "Ибупрофен", "Кларитромицин", "Лизиноприл", "Лоперамид",
    "Метформин", "Нифедипин", "Омепразол", "Парацетамол", "Рамиприл",
    "Симвастатин", "Флуконазол", "Хлорамфеникол", "Ципрофлоксацин", "Эналаприл"
];

async function checkAndAddDrugs() {
    try {
        for (let drug of drugList) {
            let existingDrug = await Drug.findOne({name: drug});
            if (!existingDrug) {
                await new Drug({name: drug}).save();
                console.log(`Added new drug: ${drug}`);
            }
        }
        console.log("Drug check completed.");
    } catch (error) {
        console.error("Error in checking and adding drugs:", error);
    }
};
