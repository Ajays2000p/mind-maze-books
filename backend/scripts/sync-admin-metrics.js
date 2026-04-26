const mongoose = require('mongoose');
const User = require('../models/User');
const Book = require('../models/Book');
const Rating = require('../models/Rating');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const TARGET_USERS = 1500;
const TARGET_RATINGS = 11000;

const FIRST_NAMES = ["Ananya", "Michael", "Vikram", "Sarah", "James", "Priya", "John", "Emma", "Rahul", "Olivia", "Arjun", "Sophia", "David", "Isabella", "Chen", "Mia", "Wei", "Charlotte", "Ahmed", "Amelia"];
const LAST_NAMES = ["Rao", "Scott", "Seth", "Smith", "Johnson", "Patel", "Williams", "Brown", "Sharma", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Kumar", "Hernandez", "Lopez", "Gonzalez", "Wilson"];

const getRandomName = () => {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return `${first} ${last}`;
};

const generateUsers = async (count) => {
    if (count <= 0) return [];
    console.log(`Generating ${count} mock users...`);
    const usersToInsert = [];
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    for (let i = 0; i < count; i++) {
        const name = getRandomName();
        // create a highly unique email
        const email = `${name.toLowerCase().replace(/\s/g, '.')}.${Date.now()}.${Math.floor(Math.random() * 10000)}@mock.example.com`;
        usersToInsert.push({
            name,
            email,
            password,
            isAdmin: false
        });
    }

    const inserted = await User.insertMany(usersToInsert);
    console.log(`Inserted ${inserted.length} users.`);
    return inserted;
};

const generateRatings = async (count, users, books) => {
    if (count <= 0) return;
    console.log(`Generating ${count} mock ratings...`);

    // Create a map to track which user rated which book to avoid duplicates
    const userBookMap = new Map();
    // Preload existing ratings to avoid colliding with seed data
    const existingRatings = await Rating.find({}, 'userId bookId');
    existingRatings.forEach(r => {
        const key = `${r.userId.toString()}_${r.bookId.toString()}`;
        userBookMap.set(key, true);
    });

    const ratingsToInsert = [];

    // Phase 1: Ensure each user gets 4-6 ratings
    console.log("Phase 1: Distributing baseline 4-6 ratings to all users...");
    for (const u of users) {
        // How many does this user already have?
        const currentCount = Array.from(userBookMap.keys()).filter(k => k.startsWith(`${u._id.toString()}_`)).length;
        const targetForUser = Math.floor(Math.random() * 3) + 4; // 4 to 6

        let neededForUser = targetForUser - currentCount;
        let p1Attempts = 0;

        while (neededForUser > 0 && p1Attempts < 50 && ratingsToInsert.length < count) {
            p1Attempts++;
            const randomBook = books[Math.floor(Math.random() * books.length)];
            const key = `${u._id.toString()}_${randomBook._id.toString()}`;

            if (!userBookMap.has(key)) {
                userBookMap.set(key, true);
                ratingsToInsert.push({
                    userId: u._id,
                    bookId: randomBook._id,
                    value: Math.floor(Math.random() * 5) + 1
                });
                neededForUser--;
            }
        }
    }

    // Phase 2: Distribute remaining ratings completely randomly
    const remainingToGenerate = count - ratingsToInsert.length;
    if (remainingToGenerate > 0) {
        console.log(`Phase 2: Distributing ${remainingToGenerate} additional required ratings uniformly...`);
        let attempts = 0;
        const maxAttempts = remainingToGenerate * 10;

        while (ratingsToInsert.length < count && attempts < maxAttempts) {
            attempts++;
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomBook = books[Math.floor(Math.random() * books.length)];
            const key = `${randomUser._id.toString()}_${randomBook._id.toString()}`;

            if (!userBookMap.has(key)) {
                userBookMap.set(key, true);
                ratingsToInsert.push({
                    userId: randomUser._id,
                    bookId: randomBook._id,
                    value: Math.floor(Math.random() * 5) + 1
                });
            }
        }
    }

    if (ratingsToInsert.length > 0) {
        // Need to insert ratings one by one or in batches and also update book rating average and count
        // For simplicity and to not overwhelm the DB with concurrent book updates, insert the ratings directly 
        // Note: The task says "create a script to generate new ratings until the Rating collection reaches 1567",
        // implying inserting directly into Rating is sufficient for the admin stats query.
        const inserted = await Rating.insertMany(ratingsToInsert);
        console.log(`Inserted ${inserted.length} ratings.`);
    } else {
        console.log('No new ratings generated (possible collision limit).');
    }
};

const seedAdminMetrics = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mind_maze_books');
        console.log('Connected to MongoDB.');

        // 1. Users
        const currentUsers = await User.countDocuments();
        console.log(`Current users: ${currentUsers}`);
        const usersNeeded = TARGET_USERS - currentUsers;

        if (usersNeeded > 0) {
            await generateUsers(usersNeeded);
        } else {
            console.log(`User target (${TARGET_USERS}) already met or exceeded.`);
        }

        // 2. Ratings
        const currentRatings = await Rating.countDocuments();
        console.log(`Current ratings: ${currentRatings}`);
        const ratingsNeeded = TARGET_RATINGS - currentRatings;

        if (ratingsNeeded > 0) {
            // Need all users and all books to associate
            const allUsers = await User.find({}, '_id');
            const allBooks = await Book.find({}, '_id');
            console.log(`Found ${allUsers.length} users and ${allBooks.length} books for ratings gen.`);
            if (allUsers.length === 0 || allBooks.length === 0) {
                console.error("Cannot generate ratings: Need at least 1 user and 1 book.");
                process.exit(1);
            }
            await generateRatings(ratingsNeeded, allUsers, allBooks);
        } else {
            console.log(`Rating target (${TARGET_RATINGS}) already met or exceeded.`);
        }

        console.log('Sync complete.');
        process.exit(0);

    } catch (err) {
        require('fs').writeFileSync('err_log.txt', err.stack);
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
};

seedAdminMetrics();
