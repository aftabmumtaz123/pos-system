const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Discount = require('../models/Discount');
const { generateReceipt } = require('../utils/pdfGenerator');

// POS Interface
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const products = await Product.find({ stock: { $gt: 0 } }).sort({ name: 1 });
        const settings = await require('../models/Setting').findOne() || {};

        res.render('cashier/pos', {
            user: req.user,
            products,
            settings
        });
    } catch (error) {
        console.error('POS error:', error);
        res.status(500).send('Server error');
    }
});

// Checkout
router.post('/checkout', isAuthenticated, async (req, res) => {
    try {
        const { items, discountId, paymentMethod, cashReceived, changeAmount, customerInfo } = req.body;

        if (!items || items.length === 0) {
            return res.json({ success: false, message: 'Cart is empty' });
        }

        // Validate stock and calculate totals
        let subtotal = 0;
        const saleItems = [];

        for (let item of items) {
            const product = await Product.findById(item.productId);

            if (!product) {
                return res.json({ success: false, message: `Product not found: ${item.productId}` });
            }

            if (product.stock < item.quantity) {
                return res.json({ success: false, message: `Not enough stock for ${product.name}` });
            }

            const itemSubtotal = product.price * item.quantity;
            subtotal += itemSubtotal;

            saleItems.push({
                product: product._id,
                productName: product.name,
                quantity: item.quantity,
                price: product.price,
                subtotal: itemSubtotal
            });

            // Update stock
            product.stock -= item.quantity;
            await product.save();
        }

        // Apply discount
        let discountAmount = 0;
        let discountCode = null;
        let discountRef = null;

        if (discountId) {
            const discount = await Discount.findById(discountId);
            if (discount && discount.isValid()) {
                discountRef = discount._id;
                discountCode = discount.code;

                if (discount.type === 'percentage') {
                    discountAmount = (subtotal * discount.value) / 100;
                } else {
                    discountAmount = discount.value;
                }
            }
        }

        const total = subtotal - discountAmount;

        // Create sale
        const sale = new Sale({
            items: saleItems,
            cashier: req.user._id,
            cashierName: req.user.username,
            discount: discountRef,
            discountCode,
            discountAmount,
            subtotal,
            tax: 0,
            total,
            paymentMethod,
            cashReceived: parseFloat(cashReceived) || 0,
            changeAmount: parseFloat(changeAmount) || 0,
            customerInfo: customerInfo || ''
        });

        await sale.save();

        res.json({
            success: true,
            message: 'Sale completed successfully!',
            saleId: sale._id
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.json({ success: false, message: 'Checkout failed. Please try again.' });
    }
});

// Generate receipt
router.get('/receipt/:id', isAuthenticated, async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('cashier', 'username')
            .populate('items.product');

        if (!sale) {
            return res.status(404).send('Receipt not found');
        }

        const pdf = await generateReceipt(sale);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${sale._id}.pdf`);
        res.send(pdf);
    } catch (error) {
        console.error('Receipt generation error:', error);
        res.status(500).send('Failed to generate receipt');
    }
});

// My Sales (Cashier)
router.get('/my-sales', isAuthenticated, async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        let query = { cashier: req.user._id };

        // Handle Date Filtering
        if (startDate || endDate || period) {
            let start = startDate ? new Date(startDate) : new Date(0);
            let end = endDate ? new Date(endDate) : new Date();

            if (period === 'today') {
                start = new Date();
                start.setHours(0, 0, 0, 0);
                end = new Date();
                end.setHours(23, 59, 59, 999);
            } else if (period === 'yesterday') {
                start = new Date();
                start.setDate(start.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end = new Date();
                end.setDate(end.getDate() - 1);
                end.setHours(23, 59, 59, 999);
            } else if (period === 'week') {
                start = new Date();
                start.setDate(start.getDate() - 7);
                start.setHours(0, 0, 0, 0);
            } else if (period === 'month') {
                start = new Date();
                start.setMonth(start.getMonth() - 1);
                start.setHours(0, 0, 0, 0);
            }

            if (endDate) end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const limit = parseInt(req.query.limit) || 20;
        const skip = parseInt(req.query.skip) || 0;

        const sales = await Sale.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCount = await Sale.countDocuments(query);
        const hasMore = skip + sales.length < totalCount;
        const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
        const totalDiscounts = sales.reduce((sum, sale) => sum + (sale.discountAmount || 0), 0);
        const avgSale = sales.length > 0 ? totalSales / sales.length : 0;

        // Dynamic Highlights Aggregation
        const productCounts = {};
        const paymentCounts = {};

        sales.forEach(sale => {
            // Count payments
            paymentCounts[sale.paymentMethod] = (paymentCounts[sale.paymentMethod] || 0) + 1;

            // Count products
            sale.items.forEach(item => {
                productCounts[item.productName] = (productCounts[item.productName] || 0) + item.quantity;
            });
        });

        const topProduct = Object.keys(productCounts).reduce((a, b) => productCounts[a] > productCounts[b] ? a : b, 'None');
        const topProductQty = productCounts[topProduct] || 0;

        const topPayment = Object.keys(paymentCounts).reduce((a, b) => paymentCounts[a] > paymentCounts[b] ? a : b, 'None');
        const topPaymentPercent = sales.length > 0 ? Math.round((paymentCounts[topPayment] / sales.length) * 100) : 0;

        res.render('cashier/sales', {
            user: req.user,
            sales,
            totalSales,
            totalDiscounts,
            avgSale,
            filters: { period, startDate, endDate },
            highlights: {
                topProduct,
                topProductQty,
                topPayment,
                topPaymentPercent
            },
            pagination: {
                hasMore,
                skip,
                limit
            }
        });
    } catch (error) {
        console.error('My sales error:', error);
        res.status(500).send('Server error');
    }
});

module.exports = router;
