require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/Auth'); // Импортируем маршруты
const doctorRoutes = require('./routes/Doctor');
const userRoutes = require('./routes/User.');
const cookieParser = require('cookie-parser');




const app = express();
const PORT = process.env.PORT || 3000;


app.use(cookieParser()); // Подключаем поддержку работы с куками
app.use(express.json()); // Позволяет работать с JSON в запросах
app.use(express.urlencoded({ extended: true })); // Позволяет работать с форм-данными
// Подключение к MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middlewares
app.use(cors());
app.use(express.json()); // Позволяет работать с JSON в запросах

// Подключение маршрутов
app.use('/api', authRoutes, doctorRoutes, userRoutes);


// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
