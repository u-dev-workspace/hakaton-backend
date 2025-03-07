const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied' });
    }

    try {
        const token = authHeader.split(' ')[1]; // Получаем сам токен
        req.user = jwt.verify(token, process.env.JWT_SECRET); // Расшифровываем
        next(); // Передаем управление следующему обработчику
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};