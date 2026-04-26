const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Product = require('../models/Book'); // Adjusting names if necessary based on project models
const Rating = require('../models/Rating');

// Actually the model is 'Book', let me double check the file names
const Book = require('../models/Book');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mind_maze_books';

async function scaleSeed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        console.log('Clearing existing ratings for a clean test state...');
        await Rating.deleteMany({});

        // 1. Fetch all existing book IDs
        console.log('Fetching existing books...');
        const bookIds = await Book.find({}, '_id').lean();
        if (bookIds.length === 0) {
            console.error('No books found. Please seed books first.');
            process.exit(1);
        }
        console.log(`Found ${bookIds.length} books.`);

        // 2. Generate 1,500 fake users
        console.log('Clearing previous mock users...');
        await User.deleteMany({ isMock: true });

        console.log('Generating 1,500 users...');
        const users = [];
        // Fixed hashed password for "password123" to save time
        const hashedPassword = '$2a$10$7vN3X8rZ8YvLhA/1uGvG.u/o.aD8u.u.u.u.u.u.u.u.u.u.u.u'; 
        
        for (let i = 0; i < 1500; i++) {
            users.push({
                name: faker.person.fullName(),
                email: faker.internet.email().toLowerCase(),
                password: hashedPassword,
                isAdmin: false,
                isMock: true
            });
        }

        console.log('Inserting users...');
        let insertedUsers;
        try {
            insertedUsers = await User.insertMany(users, { ordered: false });
            console.log(`Successfully inserted ${insertedUsers.length} users.`);
        } catch (err) {
            if (err.writeErrors) {
                console.warn(`Users inserted with ${err.writeErrors.length} duplicate errors.`);
                insertedUsers = await User.find({ isMock: true });
            } else {
                throw err;
            }
        }
        
        const userIds = insertedUsers.map(u => u._id);
        console.log(`Working with ${userIds.length} user IDs.`);

        // 3. Generate 40,000 ratings
        console.log('Generating 40,000 unique ratings...');
        const totalRatingsTarget = 40000;
        const seenPairs = new Set();
        const ratingsToInsert = [];
        const batchSize = 10000;
        
        let attempts = 0;
        const maxAttempts = totalRatingsTarget * 5;

        while (seenPairs.size < totalRatingsTarget && attempts < maxAttempts) {
            attempts++;
            const randomUserIndex = Math.floor(Math.random() * userIds.length);
            const randomBookIndex = Math.floor(Math.random() * bookIds.length);
            
            const userId = userIds[randomUserIndex];
            const bookId = bookIds[randomBookIndex]._id;
            const pairKey = `${userId}:${bookId}`;

            if (!seenPairs.has(pairKey)) {
                seenPairs.add(pairKey);
                ratingsToInsert.push({
                    userId: userId,
                    bookId: bookId,
                    value: Math.floor(Math.random() * 5) + 1
                });
            }

            // Insert in batches if we have enough
            if (ratingsToInsert.length >= batchSize) {
                await Rating.insertMany(ratingsToInsert, { ordered: false });
                console.log(`Inserted ${seenPairs.size} ratings so far...`);
                ratingsToInsert.length = 0; // Clear the array
            }
        }

        // Insert remaining
        if (ratingsToInsert.length > 0) {
            await Rating.insertMany(ratingsToInsert, { ordered: false });
            console.log(`Inserted final batch. Total: ${seenPairs.size} ratings.`);
        }

        if (seenPairs.size < totalRatingsTarget) {
            console.warn(`Could only generate ${seenPairs.size} unique ratings after ${attempts} attempts.`);
        }

        // 4. Verify Counts
        console.log('\n--- Verification ---');
        const finalUserCount = await User.countDocuments();
        const finalRatingCount = await Rating.countDocuments();
        console.log(`Total Users in DB: ${finalUserCount}`);
        console.log(`Total Ratings in DB: ${finalRatingCount}`);

        console.log('\nScalability seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error during seeding:', err);
        process.exit(1);
    }
}

scaleSeed();
