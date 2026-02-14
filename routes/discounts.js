const express = require('express');
const router = express.Router();
const { isAuthenticated, isSuperAdmin } = require('../middleware/auth');
const Discount = require('../models/Discount');

// List all discounts
router.get('/', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const { search, filter, sort } = req.query;
        let query = {};

        // Search by Code
        if (search) {
            query.code = { $regex: search.trim().toUpperCase(), $options: 'i' };
        }

        // Status Filtering logic
        const now = new Date();
        if (filter === 'active') {
            query.status = 'active';
            query.expiryDate = { $gte: now };
        } else if (filter === 'expired') {
            query.status = 'expired';
        } else if (filter === 'scheduled') {
            // Logic for scheduled if we had startDate, otherwise active but future (not standard here)
            query.status = 'active';
            query.createdAt = { $gt: now }; // Pseudo-scheduled
        } else if (filter === 'disabled') {
            query.status = 'inactive';
        }

        let sortOption = { createdAt: -1 };
        if (sort === 'expiry-soon') sortOption = { expiryDate: 1 };
        if (sort === 'value-desc') sortOption = { value: -1 };
        if (sort === 'oldest') sortOption = { createdAt: 1 };

        let discounts = await Discount.find(query).sort(sortOption);

        // Auto-update status to expired if needed before rendering
        for (let discount of discounts) {
            if (discount.expiryDate < now && discount.status === 'active') {
                discount.status = 'expired';
                await discount.save();
            }
        }

        // Metadata Counts for Dashboard
        const stats = {
            total: await Discount.countDocuments({}),
            active: await Discount.countDocuments({ status: 'active', expiryDate: { $gte: now } }),
            expired: await Discount.countDocuments({ status: 'expired' }),
            inactive: await Discount.countDocuments({ status: 'inactive' })
        };

        res.render('admin/discounts/list', {
            user: req.user,
            discounts,
            stats,
            search: search || '',
            filter: filter || '',
            sort: sort || '',
            query: req.query
        });
    } catch (error) {
        console.error('Discounts list error:', error);
        res.status(500).render('errors/500', { user: req.user, error: error.message });
    }
});

// Add discount form
router.get('/add', isAuthenticated, isSuperAdmin, (req, res) => {
    res.render('admin/discounts/form', {
        user: req.user,
        discount: null,
        error: null,
        success: null
    });
});

// Add discount POST
router.post('/add', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const { code, type, value, expiryDate } = req.body;

        const discount = new Discount({
            code: code.toUpperCase(),
            type,
            value,
            expiryDate
        });

        await discount.save();
        res.redirect('/discounts?success=Discount created successfully');
    } catch (error) {
        console.error('Add discount error:', error);
        res.render('admin/discounts/form', {
            user: req.user,
            discount: null,
            error: error.code === 11000 ? 'Discount code already exists' : 'Failed to create discount',
            success: null
        });
    }
});

// Edit discount form
router.get('/edit/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const discount = await Discount.findById(req.params.id);
        if (!discount) {
            return res.redirect('/discounts?error=Discount not found');
        }

        res.render('admin/discounts/form', {
            user: req.user,
            discount,
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Edit discount error:', error);
        res.redirect('/discounts?error=Failed to load discount');
    }
});

// Edit discount POST
router.post('/edit/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const { code, type, value, expiryDate, status } = req.body;

        await Discount.findByIdAndUpdate(req.params.id, {
            code: code.toUpperCase(),
            type,
            value,
            expiryDate,
            status,
            updatedAt: Date.now()
        });

        res.redirect('/discounts?success=Discount updated successfully');
    } catch (error) {
        console.error('Update discount error:', error);
        res.redirect('/discounts?error=Failed to update discount');
    }
});

// Delete discount
router.get('/delete/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        await Discount.findByIdAndDelete(req.params.id);
        res.redirect('/discounts?success=Discount deleted successfully');
    } catch (error) {
        console.error('Delete discount error:', error);
        res.redirect('/discounts?error=Failed to delete discount');
    }
});

// Validate discount (API endpoint for POS)
router.post('/validate', isAuthenticated, async (req, res) => {
    try {
        const { code } = req.body;

        const discount = await Discount.findOne({ code: code.toUpperCase() });

        if (!discount) {
            return res.json({ valid: false, message: 'Invalid discount code' });
        }

        if (!discount.isValid()) {
            return res.json({ valid: false, message: 'Discount code has expired' });
        }

        res.json({
            valid: true,
            discount: {
                id: discount._id,
                code: discount.code,
                type: discount.type,
                value: discount.value
            }
        });
    } catch (error) {
        console.error('Validate discount error:', error);
        res.json({ valid: false, message: 'Error validating discount' });
    }
});

module.exports = router;
