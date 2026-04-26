require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Book = require('../models/Book');
const Rating = require('../models/Rating');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log(`Connected to MongoDB: ${mongoose.connection.host}`))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

const seedTopRatedEngagements = async () => {
    try {
        console.log('Fetching users and books...');
        const allUsers = await User.find({}, '_id');
        console.log(`Found ${allUsers.length} users.`);

        if (allUsers.length === 0) {
            console.log('No users found. Please seed users first.');
            process.exit(1);
        }

        // We run the same queries from rankings to get top single & multi genre books
        // First, Single-Genre books
        const singleGenrePipeline = [
            { $group: { _id: "$bookId", ratingCount: { $sum: 1 }, averageRating: { $avg: "$value" } } },
            { $match: { ratingCount: { $gte: 1 } } },
            { $lookup: { from: "books", localField: "_id", foreignField: "_id", as: "bookDetails" } },
            { $unwind: "$bookDetails" },
            { $match: { "bookDetails.genres": { $size: 1 } } },
            { $sort: { averageRating: -1, ratingCount: -1 } },
            { $limit: 10 }
        ];

        // Second, Multi-Genre books
        const multiGenrePipeline = [
            { $group: { _id: "$bookId", ratingCount: { $sum: 1 }, averageRating: { $avg: "$value" } } },
            { $match: { ratingCount: { $gte: 1 } } },
            { $lookup: { from: "books", localField: "_id", foreignField: "_id", as: "bookDetails" } },
            { $unwind: "$bookDetails" },
            { $match: { "bookDetails.genres.1": { $exists: true } } },
            { $sort: { averageRating: -1, ratingCount: -1 } },
            { $limit: 10 }
        ];

        const topSingle = await Rating.aggregate(singleGenrePipeline);
        const topMulti = await Rating.aggregate(multiGenrePipeline);

        // Deduplicate in case a book somehow appears in both lists (it shouldn't due to genre size constraints)
        const topBookMap = new Map();
        [...topSingle, ...topMulti].forEach(r => topBookMap.set(r._id.toString(), r));

        const targetBooksIds = Array.from(topBookMap.keys());
        console.log(`Targeting ${targetBooksIds.length} top books for engagement scaling.`);

        let newRatingCount = 0;

        for (const bookIdStr of targetBooksIds) {
            const bookId = new mongoose.Types.ObjectId(bookIdStr);
            const bookInfo = topBookMap.get(bookIdStr);

            // Get all existing ratings for this book
            const existingRatings = await Rating.find({ bookId });
            const currentCount = existingRatings.length;

            // Pick a target between 300 and 400
            const randomTarget = Math.floor(Math.random() * (400 - 300 + 1)) + 300;
            const neededRatings = randomTarget - currentCount;

            if (neededRatings <= 0) {
                console.log(`Book ${bookInfo.bookDetails.title} already has ${currentCount} ratings. Skipping.`);
                continue;
            }

            console.log(`Book ${bookInfo.bookDetails.title} has ${currentCount} ratings. Generating ${neededRatings} more to reach ${randomTarget}.`);

            // Identify which users have already rated this book
            const ratedUserIds = new Set(existingRatings.map(r => r.userId.toString()));

            // Get unrated users
            const availableUsers = allUsers.filter(u => !ratedUserIds.has(u._id.toString()));

            if (availableUsers.length < neededRatings) {
                console.log(`Warning: Not enough unrated users for book ${bookInfo.bookDetails.title}. Need ${neededRatings}, have ${availableUsers.length}`);
            }

            // Shuffle available users
            for (let i = availableUsers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availableUsers[i], availableUsers[j]] = [availableUsers[j], availableUsers[i]];
            }

            // Generate ratings
            const ratingsToAdd = [];
            const countToGen = Math.min(neededRatings, availableUsers.length);

            for (let i = 0; i < countToGen; i++) {
                ratingsToAdd.push({
                    userId: availableUsers[i]._id,
                    bookId: bookId,
                    // Keep the average very high (between 4.3 and 5.0) -> Weighted randomly 4 or 5
                    // 70% chance of 5, 30% chance of 4 gives roughly ~4.7 average
                    value: Math.random() > 0.3 ? 5 : 4
                });
            }

            if (ratingsToAdd.length > 0) {
                await Rating.insertMany(ratingsToAdd);
                newRatingCount += ratingsToAdd.length;
            }
        }

        console.log(`\nSuccessfully seeded ${newRatingCount} new ratings for top books.`);

    } catch (err) {
        console.error('Error seeding engagements:', err);
    } finally {
        mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
};

seedTopRatedEngagements();
