const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Check if user is authenticated
exports.isAuthenticated = async (req, res, next) => {
    try {
        // Check session
        if (!req.session.userId) {
            req.session.returnTo = req.originalUrl;
            return res.redirect('/login');
        }

        // Get user from database
        const user = await User.findById(req.session.userId);
        if (!user) {
            req.session.destroy();
            return res.redirect('/login');
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.redirect('/login');
    }
};

// Check if user is Super Admin
exports.isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') {
        return next();
    }
    res.status(403).render('errors/403', {
        message: 'Access denied. Super Admin only.',
        user: req.user
    });
};

// Check if user is Cashier
exports.isCashier = (req, res, next) => {
    if (req.user && req.user.role === 'cashier') {
        return next();
    }
    res.status(403).render('errors/403', {
        message: 'Access denied. Cashier only.',
        user: req.user
    });
};

// Check if user is either Super Admin or Cashier (for shared routes)
exports.isAuthorized = (req, res, next) => {
    if (req.user && (req.user.role === 'super_admin' || req.user.role === 'cashier')) {
        return next();
    }
    res.status(403).render('errors/403', {
        message: 'Access denied.',
        user: req.user
    });
};
