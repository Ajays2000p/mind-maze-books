const mongoose = require('mongoose');
const Book = require('../models/Book');
const Rating = require('../models/Rating');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

function normalize(str) {
    if (!str) return '';
    return str.replace(/\(.*?\)/g, '')
              .replace(/[^\w\s]/gi, '')
              .toLowerCase()
              .replace(/\s+/g, ' ')
              .trim();
}

async function fixDuplicates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const allBooks = await Book.find({});
        console.log(`Analyzing ${allBooks.length} books for duplicates...`);

        const groups = {};
        allBooks.forEach(b => {
            const key = normalize(b.title) + '|||' + normalize(b.author);
            if (!groups[key]) groups[key] = [];
            groups[key].push(b);
        });

        const activeDups = Object.entries(groups).filter(([k, v]) => v.length > 1);
        console.log(`Found ${activeDups.length} groups of fuzzy duplicates.`);

        let deletedBooksCount = 0;
        let mergedRatingsCount = 0;

        for (const [key, matches] of activeDups) {
            // 1. Pick primary record: Priority to record with longer description or existing thumbnail
            matches.sort((a, b) => (b.description?.length || 0) - (a.description?.length || 0));
            const primary = matches[0];
            const primaryId = primary._id;
            const duplicateIds = matches.slice(1).map(m => m._id);

            console.log(`Working on group: "${key}"`);
            console.log(`- Primary: ${primary.title} (${primaryId})`);
            console.log(`- Duplicates to remove: ${duplicateIds.length}`);

            // 2. Handle ratings for each duplicate
            for (const dupId of duplicateIds) {
                const ratingsForDup = await Rating.find({ bookId: dupId });
                
                for (const rating of ratingsForDup) {
                    // Check if user already rated the primary book
                    const existingPrimaryRating = await Rating.findOne({ 
                        userId: rating.userId, 
                        bookId: primaryId 
                    });

                    if (existingPrimaryRating) {
                        // Conflict: Delete the duplicate rating
                        await Rating.findByIdAndDelete(rating._id);
                    } else {
                        // No conflict: Update rating to point to primary book
                        rating.bookId = primaryId;
                        await rating.save();
                        mergedRatingsCount++;
                    }
                }

                // 3. Delete the duplicate book
                await Book.findByIdAndDelete(dupId);
                deletedBooksCount++;
            }

            // 4. Recalculate primary book rating stats
            const allPrimaryRatings = await Rating.find({ bookId: primaryId });
            const count = allPrimaryRatings.length;
            const avg = count > 0 
                ? (allPrimaryRatings.reduce((sum, r) => sum + r.value, 0) / count).toFixed(1)
                : 0;

            await Book.findByIdAndUpdate(primaryId, {
                rating: parseFloat(avg),
                ratingCount: count
            });
        }

        console.log('\n--- Final Summary ---');
        console.log(`Merged ${activeDups.length} groups.`);
        console.log(`Deleted ${deletedBooksCount} redundant books.`);
        console.log(`Re-linked ${mergedRatingsCount} ratings to primary records.`);
        
        const finalBookCount = await Book.countDocuments();
        console.log(`Total Books remaining: ${finalBookCount}`);

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

fixDuplicates();
