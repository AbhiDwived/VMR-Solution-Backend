const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
exports.authenticate = (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded.user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Middleware to check if user has required role
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

// Combined middleware for authentication and authorization
exports.requireRole = (role) => {
    return [
        exports.authenticate,
        exports.authorize(role)
    ];
};

// Middleware to check if user is admin
exports.isAdmin = [
    exports.authenticate,
    exports.authorize('admin')
];

// Middleware to check if user is authenticated (any role)
exports.isAuthenticated = exports.authenticate;
