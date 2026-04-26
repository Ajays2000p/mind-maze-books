const mongoose = require('mongoose');
const User = require('../models/User');
const Rating = require('../models/Rating');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const ratingCounts = await Rating.aggregate([
            { $group: { _id: "$userId", count: { $sum: 1 } } },
            { $limit: 10 }
        ]);
        console.log('Aggregation Results (first 10):');
        ratingCounts.forEach(r => console.log(`ID: ${r._id}, Type: ${typeof r._id}, Count: ${r.count}`));

        const sampleUser = await User.findOne({ isMock: true });
        if (sampleUser) {
            console.log('\nSample User from DB:');
            console.log(`ID: ${sampleUser._id}, Type: ${typeof sampleUser._id}`);
            console.log(`String ID: ${sampleUser._id.toString()}`);
            
            const matchInAgg = ratingCounts.find(r => r._id && r._id.toString() === sampleUser._id.toString());
            console.log('Match found in Agg results:', !!matchInAgg);
        } else {
            console.log('No mock users found.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
