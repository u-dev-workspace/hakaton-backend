const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
    const token = req.cookies.token;
    console.log(token)
    if (!token) return res.status(401).json({ message: 'Access denied' });
    console.log(token)
    try {
        req.user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        console.log(req.user)
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};
