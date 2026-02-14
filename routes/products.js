const express = require('express');
const router = express.Router();
const { isAuthenticated, isSuperAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Product = require('../models/Product');

// List all products
router.get('/', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const { search, sort, filter, page = 1 } = req.query;
        const limit = 12;
        const skip = (parseInt(page) - 1) * limit;

        let query = {};
        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Quick Filters
        if (filter === 'low-stock') query.stock = { $gt: 0, $lt: 5 };
        if (filter === 'out-of-stock') query.stock = 0;
        if (filter && !['low-stock', 'out-of-stock'].includes(filter)) query.category = filter;

        let sortOption = { createdAt: -1 };
        if (sort === 'name-asc') sortOption = { name: 1 };
        if (sort === 'name-desc') sortOption = { name: -1 };
        if (sort === 'price-asc') sortOption = { price: 1 };
        if (sort === 'price-desc') sortOption = { price: -1 };
        if (sort === 'stock-asc') sortOption = { stock: 1 };
        if (sort === 'stock-desc') sortOption = { stock: -1 };
        if (sort === 'oldest') sortOption = { createdAt: 1 };

        const totalProducts = await Product.countDocuments(query);
        const products = await Product.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        // Metadata Counts
        const counts = {
            all: await Product.countDocuments({}),
            lowStock: await Product.countDocuments({ stock: { $gt: 0, $lt: 5 } }),
            outOfStock: await Product.countDocuments({ stock: 0 }),
            categories: await Product.distinct('category')
        };

        res.render('admin/products/list', {
            user: req.user,
            products,
            totalProducts,
            counts,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / limit),
            search: search || '',
            sort: sort || '',
            filter: filter || '',
            query: req.query
        });
    } catch (error) {
        console.error('Products list error:', error);
        res.status(500).render('errors/500', { user: req.user, error: error.message });
    }
});

// Add product form
router.get('/add', isAuthenticated, isSuperAdmin, (req, res) => {
    res.render('admin/products/form', {
        user: req.user,
        product: null,
        error: null,
        success: null
    });
});

// Add product POST
router.post('/add', isAuthenticated, isSuperAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, stock, category } = req.body;

        const product = new Product({
            name,
            description,
            price,
            stock,
            category,
            image: req.file ? `/uploads/${req.file.filename}` : '/uploads/default-product.png'
        });

        await product.save();
        res.redirect('/products?success=Product added successfully');
    } catch (error) {
        console.error('Add product error:', error);
        res.render('admin/products/form', {
            user: req.user,
            product: null,
            error: 'Failed to add product',
            success: null
        });
    }
});

// Edit product form
router.get('/edit/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.redirect('/products?error=Product not found');
        }

        res.render('admin/products/form', {
            user: req.user,
            product,
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Edit product error:', error);
        res.redirect('/products?error=Failed to load product');
    }
});

// Edit product POST
router.post('/edit/:id', isAuthenticated, isSuperAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, stock, category } = req.body;

        const updateData = {
            name,
            description,
            price,
            stock,
            category,
            updatedAt: Date.now()
        };

        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
        }

        await Product.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/products?success=Product updated successfully');
    } catch (error) {
        console.error('Update product error:', error);
        res.redirect('/products?error=Failed to update product');
    }
});

// Delete product
router.get('/delete/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/products?success=Product deleted successfully');
    } catch (error) {
        console.error('Delete product error:', error);
        res.redirect('/products?error=Failed to delete product');
    }
});

module.exports = router;
