const mongoose = require('mongoose');
const Book = require('../models/Book');
const Rating = require('../models/Rating');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

function normalize(str) {
    if (!str) return '';
    // Remove text in parentheses, trim, lowercase, remove extra spaces
    return str.replace(/\(.*?\)/g, '')
              .replace(/[^\w\s]/gi, '')
              .toLowerCase()
              .replace(/\s+/g, ' ')
              .trim();
}

async function fuzzyAudit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const allBooks = await Book.find({});
        console.log(`Analyzing ${allBooks.length} books...`);

        const groups = {};
        allBooks.forEach(b => {
            const key = normalize(b.title) + '|||' + normalize(b.author);
            if (!groups[key]) groups[key] = [];
            groups[key].push(b);
        });

        const activeDups = Object.entries(groups).filter(([k, v]) => v.length > 1);

        console.log(`Found ${activeDups.length} groups of fuzzy duplicates.`);
        if (activeDups.length > 0) {
            console.log('\nTop Fuzzy Duplicate Examples:');
            activeDups.slice(0, 10).forEach(([key, matches]) => {
                const names = matches.map(m => m.title).join(' | ');
                console.log(`- Key: ${key}`);
                console.log(`  Variants: ${names}`);
                console.log(`  Count: ${matches.length}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fuzzyAudit();
