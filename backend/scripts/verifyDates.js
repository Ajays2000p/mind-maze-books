require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Book = require('../models/Book');

async function verify() {
    await mongoose.connect(process.env.MONGODB_URI);
    const books = await Book.find({ publishedDate: { $nin: ["2020-01-01", null] } }).limit(10);
    console.log("Sample Updated Books with Real Dates:\n");
    books.forEach(b => {
        console.log(`• "${b.title}" by ${b.author} --> Published: ${b.publishedDate}`);
    });
    
    const countReal = await Book.countDocuments({ publishedDate: { $nin: ["2020-01-01", null] } });
    const count2020 = await Book.countDocuments({ publishedDate: "2020-01-01" });
    const countNull = await Book.countDocuments({ publishedDate: null });
    const total = await Book.countDocuments();
    
    console.log("\nDistribution:");
    console.log({ total, countReal, count2020, countNull });
    process.exit(0);
}

verify();
