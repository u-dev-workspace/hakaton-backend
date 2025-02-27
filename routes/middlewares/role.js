const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        console.log(req.user)
        console.log(req.user.role)
        return res.status(403).json({ message: 'Access forbidden' });
    }
    next();
};
