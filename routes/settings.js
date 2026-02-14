const express = require('express');
const router = express.Router();
const { isAuthenticated, isSuperAdmin } = require('../middleware/auth');
const Setting = require('../models/Setting');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for Logo/Favicon Upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/branding';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|ico/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (.jpg, .png, .ico) are allowed'));
    }
});

// GET Branding Settings
router.get('/branding', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            settings = await Setting.create({});
        }
        res.render('admin/settings/branding', {
            user: req.user,
            settings,
            title: 'Branding & Receipt Settings',
            currentPage: 'branding'
        });
    } catch (error) {
        console.error('Branding settings error:', error);
        res.status(500).send('Server Error');
    }
});

// POST Update Branding Settings
router.post('/branding', isAuthenticated, isSuperAdmin, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
    { name: 'loginBackground', maxCount: 1 }
]), async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Handle checkbox toggles (since they aren't sent if unchecked)
        updateData.showChange = req.body.showChange === 'on';
        updateData.showCashier = req.body.showCashier === 'on';
        updateData.showQRCode = req.body.showQRCode === 'on';
        updateData.showAddressOnReceipt = req.body.showAddressOnReceipt === 'on';

        // Handle File Uploads
        if (req.files['logo']) {
            updateData.logo = '/uploads/branding/' + req.files['logo'][0].filename;
        }
        if (req.files['favicon']) {
            updateData.favicon = '/uploads/branding/' + req.files['favicon'][0].filename;
        }
        if (req.files['loginBackground']) {
            updateData.loginBackground = '/uploads/branding/' + req.files['loginBackground'][0].filename;
        }

        let settings = await Setting.findOneAndUpdate({}, updateData, {
            new: true,
            upsert: true
        });

        res.redirect('/admin/settings/branding?success=Branding updated successfully');
    } catch (error) {
        console.error('Update branding error:', error);
        res.redirect('/admin/settings/branding?error=' + encodeURIComponent(error.message));
    }
});

module.exports = router;
