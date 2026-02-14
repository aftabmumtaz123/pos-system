const User = require('../models/User');

async function createInitialAdmin() {
    try {
        // Check if admin already exists
        const adminExists = await User.findOne({ role: 'super_admin' });

        if (!adminExists) {
            const admin = new User({
                username: process.env.ADMIN_USERNAME || 'admin',
                email: process.env.ADMIN_EMAIL || 'admin@pos.com',
                password: process.env.ADMIN_PASSWORD || 'admin123',
                role: 'super_admin'
            });

            await admin.save();
            console.log('✅ Initial Super Admin created successfully');
            console.log(`   Username: ${admin.username}`);
            console.log(`   Email: ${admin.email}`);
        } else {
            console.log('ℹ️  Super Admin already exists');
        }
    } catch (error) {
        console.error('❌ Error creating initial admin:', error.message);
    }
}

module.exports = createInitialAdmin;
