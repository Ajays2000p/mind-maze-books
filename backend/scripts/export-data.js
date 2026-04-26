const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const User = require('../models/User');
const Rating = require('../models/Rating');

dotenv.config();

const exportData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for export...');

        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        // 1. Export Users
        const users = await User.find({}).lean();
        fs.writeFileSync(
            path.join(dataDir, 'users.json'),
            JSON.stringify(users, null, 2)
        );
        console.log(`Exported ${users.length} users to users.json`);

        // 2. Export Ratings
        const ratings = await Rating.find({}).lean();
        fs.writeFileSync(
            path.join(dataDir, 'ratings.json'),
            JSON.stringify(ratings, null, 2)
        );
        console.log(`Exported ${ratings.length} ratings to ratings.json`);

        console.log('Export complete! Files are in backend/data/');
        process.exit(0);
    } catch (err) {
        console.error('Export error:', err);
        process.exit(1);
    }
};

exportData();
