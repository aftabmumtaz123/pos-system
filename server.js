require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const connectDB = require('./config/database');
const createInitialAdmin = require('./utils/initAdmin');

const app = express();

// Connect to MongoDB
connectDB().then(() => {
    // Create initial admin after DB connection
    createInitialAdmin();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));


// Make query params and settings available in all templates
app.use(async (req, res, next) => {
    res.locals.query = req.query;
    try {
        const Setting = require('./models/Setting');
        let settings = await Setting.findOne();
        if (!settings) {
            settings = await Setting.create({});
        }
        res.locals.settings = settings;
    } catch (err) {
        console.error('Middleware Settings Error:', err);
        res.locals.settings = {};
    }
    next();
});

// Routes
app.use('/', require('./routes/auth'));
app.use('/admin', require('./routes/dashboard'));
app.use('/products', require('./routes/products'));
app.use('/discounts', require('./routes/discounts'));
app.use('/pos', require('./routes/pos'));
app.use('/users', require('./routes/users'));
app.use('/admin/settings', require('./routes/settings'));

// Home route redirect
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Dashboard redirect based on role
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const User = require('./models/User');
    const user = await User.findById(req.session.userId);

    if (!user) {
        return res.redirect('/login');
    }

    if (user.role === 'super_admin') {
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/pos');
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('errors/404', {
        user: req.user || null
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('errors/500', {
        user: req.user || null,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 POS System ready!`);
});
