const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Book = require('../models/Book');
const Rating = require('../models/Rating');
const dotenv = require('dotenv');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        const filePath = path.join(__dirname, '../data/enriched.json');
        if (!fs.existsSync(filePath)) {
            console.error('enriched.json not found at:', filePath);
            process.exit(1);
        }

        const books = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        console.log(`Found ${books.length} books in enriched.json`);

        await Book.deleteMany({});
        console.log('Cleared existing books.');


        const formattedBooks = books.map(book => ({
            title: book.title,
            author: book.author,
            genres: book.genres,
            description: book.description,
            rating: book.rating,
            ratingCount: book.ratingCount,
            popularityScore: book.popularityScore,
            thumbnailUrl: book.thumbnailUrl,
            publishedDate: "2020-01-01",
            pages: 300,
        }));

        try {
            await Book.insertMany(formattedBooks, { ordered: false });
        } catch (insertErr) {
            if (insertErr.code !== 11000) {
                console.error('Insert error:', insertErr.message);
                throw insertErr;
            }
            console.log('Some duplicate books were ignored, other books seeded successfully.');
        }
        console.log('Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedData();
