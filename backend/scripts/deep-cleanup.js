const mongoose = require('mongoose');
const User = require('../models/User');
const Rating = require('../models/Rating');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mind_maze_books';

async function deepCleanup() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        console.log('Deep Cleaning Database...');

        // 1. Delete all ratings
        const ratingResult = await Rating.deleteMany({});
        console.log(`Deleted ${ratingResult.deletedCount} ratings.`);

        // 2. Delete all users except admin@gmail.com
        const userResult = await User.deleteMany({
            email: { $ne: 'admin@gmail.com' }
        });
        console.log(`Deleted ${userResult.deletedCount} users (kept admin@gmail.com).`);

        console.log('\nCleanup finished! Ready for a fresh seed.');
        process.exit(0);
    } catch (err) {
        console.error('Cleanup failed:', err);
        process.exit(1);
    }
}

deepCleanup();
