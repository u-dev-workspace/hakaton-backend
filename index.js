require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/Auth'); // Импортируем маршруты
const doctorRoutes = require('./routes/Doctor');
const userRoutes = require('./routes/User.');
const adminRoutes = require("./routes/Supervisor");
const genRoutes = require("./routes/General");
const searchRoutes = require("./routes/Search");
const cookieParser = require('cookie-parser');
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser()); // Подключаем поддержку работы с куками
app.use(express.json()); // Позволяет работать с JSON в запросах
app.use(express.urlencoded({ extended: true })); // Позволяет работать с форм-данными

// ✅ Настроенный CORS (ВАЖНО ДО session и routes)
app.use(cors({
    origin: process.env.ALLOWED_HOST, // 🔥 Должен быть точный URL фронта
    credentials: true, // 🔥 ОБЯЗАТЕЛЬНО для передачи куки
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
    exposedHeaders: ["Set-Cookie"]
}));

// ✅ Настроенный `express-session`
app.use(session({
    secret: process.env.JWT_SECRET || "default_secret",
    resave: false, // 🔥 НЕ перезаписываем сессию, если она не изменилась
    saveUninitialized: false, // 🔥 НЕ создаем сессию, если в ней нет данных
    cookie: {
        secure: false,  // 🔥 Должно быть false на localhost (HTTPS нужен для true)
        httpOnly: true, // ✅ Безопасно, JS не может прочитать
        sameSite: "lax", // 🔥 Разрешает куки между `localhost:3000` и `localhost:3001`
        maxAge: 1000 * 60 * 60 * 24 // 1 день
    }
}));


mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// ✅ Подключаем парсинг JSON и cookies (ВАЖНО ДО session)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", process.env.ALLOWED_HOST); // No '*'
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

app.use('/api', authRoutes, doctorRoutes, userRoutes, adminRoutes, genRoutes, searchRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
