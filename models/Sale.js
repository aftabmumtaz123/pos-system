const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        productName: String,
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        subtotal: {
            type: Number,
            required: true
        }
    }],
    cashier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cashierName: String,
    discount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discount'
    },
    discountCode: String,
    discountAmount: {
        type: Number,
        default: 0
    },
    subtotal: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'easypaisa', 'jazzcash'],
        required: true
    },
    cashReceived: {
        type: Number,
        default: 0
    },
    changeAmount: {
        type: Number,
        default: 0
    },
    customerInfo: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Sale', saleSchema);
