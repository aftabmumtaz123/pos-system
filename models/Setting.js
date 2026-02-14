const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    // Business Information
    businessName: {
        type: String,
        default: 'POS System'
    },
    tagline: {
        type: String,
        default: 'Modern Retail Solutions'
    },
    address: {
        type: String,
        default: ''
    },
    brandName: {
        type: String,
        default: ''
    },
    // ... rest of business info
    phone: {
        type: String,
        default: ''
    },
    whatsapp: {
        type: String,
        default: ''
    },
    website: {
        type: String,
        default: ''
    },
    instagram: {
        type: String,
        default: ''
    },

    // Logos & Images
    logo: {
        type: String,
        default: '/uploads/default-logo.png'
    },
    favicon: {
        type: String,
        default: '/favicon.ico'
    },
    loginBackground: {
        type: String,
        default: ''
    },

    // Receipt Settings
    receiptTitle: {
        type: String,
        default: 'Point of Sale Receipt'
    },
    showAddressOnReceipt: {
        type: Boolean,
        default: true
    },
    showChange: {
        type: Boolean,
        default: true
    },
    showCashier: {
        type: Boolean,
        default: true
    },
    showQRCode: {
        type: Boolean,
        default: true
    },
    qrCodeType: {
        type: String,
        enum: ['whatsapp', 'review', 'website', 'custom'],
        default: 'whatsapp'
    },
    qrCodeLink: {
        type: String,
        default: ''
    },
    thankYouMessage: {
        type: String,
        default: 'Thank you for your purchase! Please come again ♥'
    },

    // Visual Settings & Theme
    primaryColor: {
        type: String,
        default: '#4f46e5'
    },
    secondaryColor: {
        type: String,
        default: '#818cf8'
    },
    accentSuccessColor: {
        type: String,
        default: '#10b981'
    },
    accentWarningColor: {
        type: String,
        default: '#f56565'
    },
    backgroundStyle: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
    },
    receiptWidth: {
        type: String,
        enum: ['58mm', '80mm'],
        default: '80mm'
    }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
