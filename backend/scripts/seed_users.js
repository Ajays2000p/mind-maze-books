const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Book = require('../models/Book');
const Rating = require('../models/Rating');

dotenv.config();

const SEED_USERS_COUNT = 100;
const SEED_RATINGS_COUNT = 600;

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB: Mind Maze Books');

        // 1. Get existing books
        const books = await Book.find({});
        if (books.length === 0) {
            console.log('No books found. Please seed books first.');
            process.exit(1);
        }
        console.log(`Found ${books.length} books.`);

        // 2. Hash password for all seeded users
        const hashedPassword = await bcrypt.hash('password123', 10);

        console.log('Generating users...');
        const users = [];
        for (let i = 0; i < SEED_USERS_COUNT; i++) {
            users.push({
                name: faker.person.fullName(),
                email: faker.internet.email(),
                password: hashedPassword,
                isAdmin: false
            });
        }

        // Use try-catch for insertMany to handle possible duplicate emails from faker
        let createdUsers;
        try {
            createdUsers = await User.insertMany(users, { ordered: false });
            console.log(`${createdUsers.length} users created.`);
        } catch (err) {
            console.log(`Partial success: ${err.insertedDocs ? err.insertedDocs.length : 'some'} users created (probably due to duplicate emails).`);
            createdUsers = await User.find({ password: hashedPassword });
        }

        if (createdUsers.length === 0) {
            console.log('No users available to create ratings.');
            process.exit(1);
        }

        // 3. Generate ratings
        console.log('Generating ratings...');
        const ratings = [];
        const userBookPairs = new Set();

        // Load existing ratings to avoid duplicates
        const existingRatings = await Rating.find({});
        existingRatings.forEach(r => {
            userBookPairs.add(`${r.userId}-${r.bookId}`);
        });

        while (ratings.length < SEED_RATINGS_COUNT) {
            const randomUser = createdUsers[faker.number.int({ min: 0, max: createdUsers.length - 1 })];
            const randomBook = books[faker.number.int({ min: 0, max: books.length - 1 })];

            const pairKey = `${randomUser._id}-${randomBook._id}`;
            if (!userBookPairs.has(pairKey)) {
                userBookPairs.add(pairKey);
                ratings.push({
                    userId: randomUser._id,
                    bookId: randomBook._id,
                    value: faker.number.int({ min: 1, max: 5 })
                });
            }

            // Safety break if we run out of unique pairs (unlikely with 100 users and many books)
            if (userBookPairs.size >= (createdUsers.length * books.length)) break;
        }

        try {
            await Rating.insertMany(ratings, { ordered: false });
            console.log(`${ratings.length} new ratings created.`);
        } catch (err) {
            console.log(`Partial success: ${err.insertedDocs ? err.insertedDocs.length : 'some'} ratings created.`);
        }

        const totalRatings = await Rating.countDocuments();
        console.log(`Total ratings in database: ${totalRatings}`);

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seedData();
