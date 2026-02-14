const express = require('express');
const router = express.Router();
const { isAuthenticated, isSuperAdmin } = require('../middleware/auth');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const User = require('../models/User');

// Admin Dashboard
router.get('/dashboard', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

        // Current metrics
        const salesData = await Sale.aggregate([
            { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
        ]);
        const todayTotal = salesData.length > 0 ? salesData[0].total : 0;
        const todayCount = salesData.length > 0 ? salesData[0].count : 0;

        const monthData = await Sale.aggregate([
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
        ]);
        const monthTotal = monthData.length > 0 ? monthData[0].total : 0;
        const monthCount = monthData.length > 0 ? monthData[0].count : 0;

        // Historical comparison metrics
        const yesterdayData = await Sale.aggregate([
            { $match: { createdAt: { $gte: yesterday, $lt: today } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const yesterdayTotal = yesterdayData.length > 0 ? yesterdayData[0].total : 0;

        const lastMonthData = await Sale.aggregate([
            { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const lastMonthTotal = lastMonthData.length > 0 ? lastMonthData[0].total : 0;

        // Percentage changes
        const salesChange = yesterdayTotal === 0 ? (todayTotal > 0 ? 100 : 0) : ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
        const monthChange = lastMonthTotal === 0 ? (monthTotal > 0 ? 100 : 0) : ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100;

        // Get low stock products
        const lowStockProducts = await Product.find({ stock: { $lt: 5 } }).limit(10);

        // Recent activity (latest sales)
        const recentSales = await Sale.find()
            .populate('cashier', 'username')
            .sort({ createdAt: -1 })
            .limit(10);

        // Top Selling Products
        const topProducts = await Sale.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productName',
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 6 }
        ]);

        // Sales chart data
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const daySales = await Sale.aggregate([
                { $match: { createdAt: { $gte: date, $lt: nextDate } } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]);

            chartData.push({
                date: date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' }),
                total: daySales.length > 0 ? daySales[0].total : 0
            });
        }

        res.render('admin/dashboard', {
            user: req.user,
            currentPage: 'dashboard',
            todayTotal,
            todayCount,
            monthTotal,
            monthCount,
            yesterdayTotal,
            lastMonthTotal,
            salesChange,
            monthChange,
            lowStockProducts,
            recentSales,
            topProducts,
            chartData,
            query: req.query
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('errors/500', { user: req.user, error: error.message });
    }
});

// Reports page with advanced comparison and presets
router.get('/reports', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        let { startDate, endDate, preset } = req.query;
        let start, end;
        const now = new Date();

        // 1. Handle Date Presets
        if (preset === 'today') {
            start = new Date(now.setHours(0, 0, 0, 0));
            end = new Date(now.setHours(23, 59, 59, 999));
        } else if (preset === 'yesterday') {
            start = new Date(now.setDate(now.getDate() - 1));
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setHours(23, 59, 59, 999);
        } else if (preset === 'this-week') {
            const day = now.getDay() || 7;
            start = new Date(now.setHours(0, 0, 0, 0));
            start.setDate(now.getDate() - day + 1);
            end = new Date();
        } else if (preset === 'last-30-days') {
            start = new Date(now);
            start.setDate(now.getDate() - 30);
            end = new Date();
        } else if (preset === 'this-month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date();
        } else if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate + 'T23:59:59');
        } else {
            // Default to this month
            preset = 'this-month';
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date();
        }

        const dateFilter = { createdAt: { $gte: start, $lte: end } };

        // 2. Calculate Comparison Period
        const duration = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(start.getTime() - duration - 1);
        const prevDateFilter = { createdAt: { $gte: prevStart, $lte: prevEnd } };

        // 3. Current Period Data
        const sales = await Sale.find(dateFilter).populate('cashier', 'username').sort({ createdAt: -1 });
        const summary = await Sale.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
        ]);
        const currentTotal = summary.length > 0 ? summary[0].total : 0;
        const currentCount = summary.length > 0 ? summary[0].count : 0;
        const currentAvg = currentCount > 0 ? currentTotal / currentCount : 0;

        // 4. Previous Period Data (for comparison)
        const prevSummary = await Sale.aggregate([
            { $match: prevDateFilter },
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
        ]);
        const prevTotal = prevSummary.length > 0 ? prevSummary[0].total : 0;
        const prevCount = prevSummary.length > 0 ? prevSummary[0].count : 0;
        const prevAvg = prevCount > 0 ? prevTotal / prevCount : 0;

        // 5. Calculate Changes (%)
        const calcChange = (cur, prev) => prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
        const totalChange = calcChange(currentTotal, prevTotal);
        const countChange = calcChange(currentCount, prevCount);
        const avgChange = calcChange(currentAvg, prevAvg);

        // 6. Enhanced Top Products
        const topProducts = await Sale.aggregate([
            { $match: dateFilter },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productName',
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: '$items.subtotal' },
                    transAccount: { $addToSet: '$_id' }
                }
            },
            { $addFields: { transCount: { $size: '$transAccount' } } },
            { $sort: { revenue: -1 } },
            { $limit: 10 }
        ]);

        // 7. Enhanced Cashier Stats
        const cashierStats = await Sale.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$cashierName',
                    totalSales: { $sum: '$total' },
                    count: { $sum: 1 },
                    avgTicket: { $avg: '$total' }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        res.render('admin/reports', {
            user: req.user,
            sales,
            stats: {
                currentTotal, currentCount, currentAvg,
                totalChange, countChange, avgChange,
                prevTotal, prevCount
            },
            topProducts,
            cashierStats,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            preset: preset || 'custom',
            query: req.query
        });
    } catch (error) {
        console.error('Reports error:', error);
        res.status(500).render('errors/500', { user: req.user, error: error.message });
    }
});

module.exports = router;
