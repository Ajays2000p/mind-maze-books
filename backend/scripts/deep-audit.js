const mongoose = require('mongoose');
const Book = require('../models/Book');
const Rating = require('../models/Rating');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function deepAudit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Find Case-Insensitive Duplicates
        const dups = await Book.aggregate([
            {
                $project: {
                    title_low: { $toLower: "$title" },
                    author_low: { $toLower: "$author" },
                    title: 1,
                    author: 1
                }
            },
            {
                $group: {
                    _id: { title: "$title_low", author: "$author_low" },
                    count: { $sum: 1 },
                    ids: { $push: "$_id" },
                    originalNames: { $addToSet: "$title" }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]);

        console.log(`Found ${dups.length} groups of duplicate books (case-insensitive).`);
        if (dups.length > 0) {
            dups.slice(0, 10).forEach(group => {
                console.log(`- "${group._id.title}" by ${group._id.author}: ${group.count} copies`);
            });
        }

        // 2. Find Orphaned Ratings
        const ratingBookIds = await Rating.distinct('bookId');
        const existingBookIds = await Book.distinct('_id');
        const existingBookIdSet = new Set(existingBookIds.map(id => id.toString()));
        
        const orphaned = ratingBookIds.filter(id => !existingBookIdSet.has(id.toString()));
        console.log(`\nFound ${orphaned.length} orphaned ratings (pointing to non-existent book IDs).`);
        
        if (orphaned.length > 0) {
            const sampleOrphan = orphaned[0];
            const ratingCount = await Rating.countDocuments({ bookId: sampleOrphan });
            console.log(`- Example orphan ID ${sampleOrphan} has ${ratingCount} ratings.`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

deepAudit();
