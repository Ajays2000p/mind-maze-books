const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
const Book = require('../models/Book');

async function inspect() {
    await mongoose.connect(process.env.MONGODB_URI);
    const count2020 = await Book.countDocuments({ publishedDate: "2020-01-01" });
    const count2020Year = await Book.countDocuments({ publishedDate: "2020" });
    const countNull = await Book.countDocuments({ $or: [{ publishedDate: { $exists: false } }, { publishedDate: null }, { publishedDate: "" }] });
    const countOther = await Book.countDocuments({ publishedDate: { $nin: ["2020-01-01", "2020", null, ""] } });
    const total = await Book.countDocuments();
    
    console.log({ total, count2020, count2020Year, countNull, countOther });
    
    const sample = await Book.find({}).select('title author publishedDate').limit(10);
    console.log("Sample books from DB:", sample);
    
    process.exit(0);
}

inspect().catch(err => { console.error(err); process.exit(1); });
