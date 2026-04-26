const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const User = require('../models/User');
const Rating = require('../models/Rating');

dotenv.config();

const importData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for import...');

        const dataDir = path.join(__dirname, '../data');

        // 1. Import Users
        const usersPath = path.join(dataDir, 'users.json');
        if (fs.existsSync(usersPath)) {
            const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
            
            // Clean up incoming data for insertion
            const formattedUsers = users.map(u => ({
                ...u,
                _id: new mongoose.Types.ObjectId(u._id)
            }));

            await User.deleteMany({}); // Clear existing to prevent collisions
            await User.collection.insertMany(formattedUsers); // Direct collection level avoid middleware
            console.log(`Imported ${formattedUsers.length} users.`);
        }

        // 2. Import Ratings
        const ratingsPath = path.join(dataDir, 'ratings.json');
        if (fs.existsSync(ratingsPath)) {
            const ratings = JSON.parse(fs.readFileSync(ratingsPath, 'utf-8'));
            
            const formattedRatings = ratings.map(r => ({
                ...r,
                _id: new mongoose.Types.ObjectId(r._id),
                userId: new mongoose.Types.ObjectId(r.userId),
                bookId: new mongoose.Types.ObjectId(r.bookId)
            }));

            await Rating.deleteMany({});
            await Rating.collection.insertMany(formattedRatings);
            console.log(`Imported ${formattedRatings.length} ratings.`);
        }

        console.log('Import complete! User database is synchronized.');
        process.exit(0);
    } catch (err) {
        console.error('Import error:', err);
        process.exit(1);
    }
};

importData();
