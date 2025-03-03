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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser()); // Подключаем поддержку работы с куками
app.use(express.json()); // Позволяет работать с JSON в запросах
app.use(express.urlencoded({ extended: true })); // Позволяет работать с форм-данными

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json());
app.use(cors({
    origin: "*", // Разрешить все источники
    methods: ["GET", "POST", "PUT", "DELETE"], // Разрешенные методы
    allowedHeaders: ["Content-Type", "Authorization"], // Разрешенные заголовки
    credentials: true // Разрешить передачу куки (не работает с "*")
}));
app.use('/api', authRoutes, doctorRoutes, userRoutes, adminRoutes, genRoutes, searchRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
