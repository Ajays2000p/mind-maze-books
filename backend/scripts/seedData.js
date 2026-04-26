const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Book = require('../models/Book');

const seedData = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // Path to enriched.json (contains cover images)
        const jsonPath = path.resolve(__dirname, '../../enriched.json');

        console.log(`Reading data from: ${jsonPath}`);
        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const books = JSON.parse(rawData);

        console.log(`Parsed ${books.length} books from JSON.`);

        // Clear existing books
        console.log('Clearing existing books collection...');
        await Book.deleteMany({});

        // Import books
        console.log('Importing real data...');

        // We might want to chunk this if the dataset is huge, 
        // but for 5,000-10,000 books, insertMany is usually fine.
        // Let's use a batch size of 1000 just in case.
        const batchSize = 1000;
        for (let i = 0; i < books.length; i += batchSize) {
            const batch = books.slice(i, i + batchSize);
            try {
                await Book.insertMany(batch, { ordered: false });
            } catch (insertErr) {
                // If it's a duplicate key error, we can ignore it since we cleared the collection
                // but enriched.json itself might have duplicates
                if (insertErr.code !== 11000) {
                    console.error(`Batch starting at ${i} had errors:`, insertErr.message);
                }
            }
            console.log(`Processed ${i + batch.length} / ${books.length} books...`);
        }

        console.log('Seeding completed successfully!');

        // Verify count
        const count = await Book.countDocuments();
        console.log(`Final document count in DB: ${count}`);

        if (count === books.length) {
            console.log('Verification SUCCESS: DB count matches JSON count.');
        } else {
            console.log(`Verification WARNING: count mismatch! DB: ${count}, JSON: ${books.length}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err.message);
        process.exit(1);
    }
};

seedData();
