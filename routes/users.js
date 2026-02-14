const express = require('express');
const router = express.Router();
const { isAuthenticated, isSuperAdmin } = require('../middleware/auth');
const User = require('../models/User');

// List all users
router.get('/', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const { search, role, sort } = req.query;
        let query = {};

        if (search) {
            query = {
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
        }

        if (role) {
            query.role = role;
        }

        let sortOption = { createdAt: -1 };
        if (sort === 'username-asc') sortOption = { username: 1 };
        if (sort === 'username-desc') sortOption = { username: -1 };
        if (sort === 'role') sortOption = { role: 1 };
        if (sort === 'oldest') sortOption = { createdAt: 1 };

        const usersList = await User.find(query).sort(sortOption);

        // Stats for dashboard
        const stats = {
            total: await User.countDocuments({}),
            admins: await User.countDocuments({ role: 'super_admin' }),
            cashiers: await User.countDocuments({ role: 'cashier' })
        };

        res.render('admin/users', {
            user: req.user,
            users: usersList,
            stats,
            search: search || '',
            role: role || '',
            sort: sort || '',
            query: req.query
        });
    } catch (error) {
        console.error('Users list error:', error);
        res.status(500).render('errors/500', { user: req.user, error: error.message });
    }
});

// Add user form
router.get('/add', isAuthenticated, isSuperAdmin, (req, res) => {
    res.render('admin/users/add', {
        user: req.user,
        error: null,
        success: null,
        formData: {}
    });
});

// Add user POST
router.post('/add', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.render('admin/users/add', {
                user: req.user,
                error: 'Username or email already exists',
                success: null,
                formData: req.body
            });
        }

        const newUser = new User({
            username,
            email,
            password,
            role: role || 'cashier'
        });

        await newUser.save();
        res.redirect('/users?success=User created successfully');
    } catch (error) {
        console.error('Add user error:', error);
        res.render('admin/users/add', {
            user: req.user,
            error: 'Failed to create user. Please try again.',
            success: null,
            formData: req.body
        });
    }
});

// Edit user
router.post('/edit/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const { username, email, role, password } = req.body;
        const userId = req.params.id;

        // Prevent changing your own role
        if (userId === req.user._id.toString() && role !== req.user.role) {
            return res.redirect('/users?error=You cannot change your own role');
        }

        const updateData = { username, email, role, updatedAt: Date.now() };

        // If password is provided, hash it manually or let the schema handle it if it's set up
        if (password && password.trim() !== '') {
            const user = await User.findById(userId);
            if (user) {
                user.password = password;
                await user.save();
                // We return here because save will trigger the pre-save hook for hashing
                return res.redirect('/users?success=User updated successfully');
            }
        }

        await User.findByIdAndUpdate(userId, updateData);
        res.redirect('/users?success=User updated successfully');
    } catch (error) {
        console.error('Edit user error:', error);
        res.redirect('/users?error=Failed to update user');
    }
});

// Delete user
router.get('/delete/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        // Prevent deleting yourself
        if (req.params.id === req.user._id.toString()) {
            return res.redirect('/users?error=Cannot delete your own account');
        }

        await User.findByIdAndDelete(req.params.id);
        res.redirect('/users?success=User deleted successfully');
    } catch (error) {
        console.error('Delete user error:', error);
        res.redirect('/users?error=Failed to delete user');
    }
});

// User Detail Dashboard
router.get('/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            return res.redirect('/users?error=User not found');
        }

        const Sale = require('../models/Sale');
        const Product = require('../models/Product');

        // Basic Sales Stats
        const salesStats = await Sale.aggregate([
            { $match: { cashier: targetUser._id } },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$total' },
                    transactionCount: { $sum: 1 },
                    averageSaleValue: { $avg: '$total' },
                    totalDiscounts: { $sum: '$discountAmount' }
                }
            }
        ]);

        const stats = salesStats[0] || {
            totalSales: 0,
            transactionCount: 0,
            averageSaleValue: 0,
            totalDiscounts: 0
        };

        // Most used payment method
        const paymentStats = await Sale.aggregate([
            { $match: { cashier: targetUser._id } },
            { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);
        const topPaymentMethod = paymentStats.length > 0 ? paymentStats[0]._id : 'N/A';

        // Top selling product (by volume)
        const productStats = await Sale.aggregate([
            { $match: { cashier: targetUser._id } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    name: { $first: '$items.productName' },
                    totalQty: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { totalQty: -1 } },
            { $limit: 1 }
        ]);
        const topProduct = productStats.length > 0 ? productStats[0] : null;

        // Sales for the last 30 days (for chart)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailySales = await Sale.aggregate([
            {
                $match: {
                    cashier: targetUser._id,
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    total: { $sum: "$total" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Recent sales
        const recentSales = await Sale.find({ cashier: targetUser._id })
            .sort({ createdAt: -1 })
            .limit(10);

        res.render('admin/users/detail', {
            user: req.user,
            targetUser,
            stats,
            topPaymentMethod,
            topProduct,
            dailySales: JSON.stringify(dailySales),
            recentSales,
            needsCharts: true,
            currentPage: 'users'
        });
    } catch (error) {
        console.error('User detail error:', error);
        res.redirect('/users?error=Error fetching user details');
    }
});

// Toggle user status
router.get('/toggle-status/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            return res.redirect('/users?error=User not found');
        }

        if (targetUser._id.toString() === req.user._id.toString()) {
            return res.redirect('/users?error=You cannot deactivate your own account');
        }

        targetUser.isActive = !targetUser.isActive;
        await targetUser.save();
        res.redirect(`/users/${targetUser._id}?success=User status updated`);
    } catch (error) {
        console.error('Toggle status error:', error);
        res.redirect('/users?error=Failed to update user status');
    }
});

module.exports = router;
