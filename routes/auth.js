const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login page
router.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('auth/login', { error: null });
});

// Login POST
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.render('auth/login', { error: 'Invalid username or password' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('auth/login', { error: 'Invalid username or password' });
        }

        // Check if user is active
        if (user.isActive === false) {
            return res.render('auth/login', { error: 'Your account has been deactivated. Please contact administrator.' });
        }

        // Update login stats
        user.lastLogin = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();

        // Set session
        req.session.userId = user._id;
        req.session.userRole = user.role;

        // Redirect based on role
        if (user.role === 'super_admin') {
            return res.redirect('/admin/dashboard');
        } else {
            return res.redirect('/pos');
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', { error: 'An error occurred. Please try again.' });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

module.exports = router;
