const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Book = require('../models/Book');
const Rating = require('../models/Rating');
const User = require('../models/User');

const syncData = async () => {
    try {
        console.log('Connecting to MongoDB:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected successfully.');

        // 1. Load data from enriched.json
        const jsonPath = path.resolve(__dirname, '../../enriched.json');
        console.log(`Reading books from: ${jsonPath}`);
        const booksData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log(`Parsed ${booksData.length} books.`);

        // 2. Clear existing collections
        console.log('Clearing Books and Ratings...');
        await Book.deleteMany({});
        await Rating.deleteMany({});
        // We keep Users but we'll need some for dummy ratings

        // 3. Import Books with real metrics
        console.log('Importing books with real ratings and popularity...');
        const batchSize = 1000;
        for (let i = 0; i < booksData.length; i += batchSize) {
            const batch = booksData.slice(i, i + batchSize);
            await Book.insertMany(batch.map(b => ({
                ...b,
                rating: b.rating || 0,
                ratingCount: b.ratingCount || 0,
                popularityScore: b.popularityScore || 0
            })), { ordered: false });
            console.log(`  Imported ${Math.min(i + batchSize, booksData.length)} / ${booksData.length}`);
        }

        // 4. Generate valid Dummy Ratings for Top Rated/Most Rated logic
        console.log('Generating valid dummy ratings for recommendations/rankings...');
        const users = await User.find().limit(50);
        if (users.length === 0) {
            console.log('No users found. Please register a user first or run user seed script.');
        } else {
            const books = await Book.find().limit(200); // Sample for ratings
            const dummyRatings = [];

            users.forEach(user => {
                // Each user rates 10-20 random books from the sample
                const count = Math.floor(Math.random() * 11) + 10;
                const shuffled = books.sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, count);

                selected.forEach(book => {
                    dummyRatings.push({
                        userId: user._id,
                        bookId: book._id,
                        value: Math.floor(Math.random() * 3) + 3 // 3-5 stars
                    });
                });
            });

            console.log(`Inserting ${dummyRatings.length} synchronized ratings...`);
            await Rating.insertMany(dummyRatings);
        }

        console.log('Data synchronization complete!');
        process.exit(0);
    } catch (err) {
        console.error('Sync failed:', err);
        process.exit(1);
    }
};

syncData();
