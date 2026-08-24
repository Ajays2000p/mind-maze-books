require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Book = require('../models/Book');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchGoogleBooksCover(title, author) {
    try {
        const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
        const keyParam = apiKey ? `&key=${apiKey}` : '';

        // 1. Try strict search
        let url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}${keyParam}`;
        let response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let data = await response.json();
        let items = data.items;
        
        // 2. Fallback to loose search if no results or no thumbnails found
        if (!items || !items.some(item => item.volumeInfo?.imageLinks?.thumbnail)) {
            url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title + " " + author)}${keyParam}`;
            response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            data = await response.json();
            items = data.items;
        }

        if (items && items.length > 0) {
            // Find the best match: an item that has an imageLink (preferably thumbnail or smallThumbnail)
            for (const item of items) {
                const imageLinks = item.volumeInfo?.imageLinks;
                if (imageLinks && imageLinks.thumbnail) {
                    // Make it https
                    return imageLinks.thumbnail.replace('http:', 'https:');
                }
                if (imageLinks && imageLinks.smallThumbnail) {
                    return imageLinks.smallThumbnail.replace('http:', 'https:');
                }
            }
        }
        return null;
    } catch (error) {
        console.error(`API Error for "${title}":`, error.message);
        throw error; // Throw so we can retry or log failure properly
    }
}

async function migrateCovers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find books that have NOT had a migration attempt yet
        const books = await Book.find({
            $or: [
                { coverMigrationAttempted: { $exists: false } },
                { coverMigrationAttempted: false }
            ]
        });

        console.log(`Found ${books.length} books to process.`);

        let successCount = 0;
        let failCount = 0;
        let errorCount = 0;

        for (let i = 0; i < books.length; i++) {
            const book = books[i];
            console.log(`[${i + 1}/${books.length}] Processing: "${book.title}" by ${book.author}`);

            let retries = 3;
            let coverUrl = null;
            let success = false;

            while (retries > 0 && !success) {
                try {
                    coverUrl = await fetchGoogleBooksCover(book.title, book.author);
                    success = true;
                } catch (e) {
                    retries--;
                    if (retries > 0) {
                        console.log(`Retrying... (${retries} attempts left)`);
                        await delay(2000); // longer delay on error
                    }
                }
            }

            if (success) {
                if (coverUrl) {
                    book.realCoverImage = coverUrl;
                    console.log(`  -> SUCCESS: Found real cover`);
                    successCount++;
                } else {
                    book.realCoverImage = null;
                    console.log(`  -> NO COVER: No valid cover found on Google Books`);
                    failCount++;
                }
                book.coverMigrationAttempted = true;
            } else {
                console.log(`  -> ERROR: Failed to fetch after retries. Will retry on next run.`);
                errorCount++;
            }

            await book.save();

            // Delay to respect rate limits
            await delay(750); // 750ms delay
        }

        console.log('\n--- Migration Summary ---');
        console.log(`Total processed: ${books.length}`);
        console.log(`Success (Cover Found): ${successCount}`);
        console.log(`No Cover Found: ${failCount}`);
        console.log(`API Errors: ${errorCount}`);

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

migrateCovers();
