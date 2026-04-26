require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('../models/Book');
const { generateCover } = require('../utils/coverGenerator');

const BAD_DOMAINS = [
    'unsplash.com',
    'picsum.photos',
    'loremflickr.com',
    'placeholder.com',
    'dummyimage.com'
];

async function fixCovers() {
    try {
        console.log(`Connecting to MongoDB at ${process.env.MONGODB_URI}...`);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('Fetching all books...');
        const books = await Book.find({});
        console.log(`Found ${books.length} total books.`);

        let modifiedCount = 0;
        let skippedCount = 0;

        for (const book of books) {
            let isMismatched = false;
            let url = book.thumbnailUrl || "";

            if (!url) {
                isMismatched = true;
            } else if (url === '/placeholder.svg') {
                isMismatched = true;
            } else if (url.startsWith('http')) {
                for (const domain of BAD_DOMAINS) {
                    if (url.includes(domain)) {
                        isMismatched = true;
                        break;
                    }
                }
            }

            if (isMismatched) {
                // Generate a new clean SVG cover
                const newUri = await generateCover(book.title, book.author);
                book.thumbnailUrl = newUri;
                await book.save();
                modifiedCount++;
                if (modifiedCount % 50 === 0) {
                    console.log(`Replaced covers for ${modifiedCount} mismatched books so far...`);
                }
            } else {
                skippedCount++;
            }
        }

        console.log(`\n=== Execution Report ===`);
        console.log(`- Covers Skipped (Valid): ${skippedCount}`);
        console.log(`- Covers Replaced (Mismatched/Missing): ${modifiedCount}`);
        console.log(`- Total Books Evaluated: ${books.length}`);
        
    } catch (e) {
        console.error('An error occurred:', e);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    }
}

fixCovers();
