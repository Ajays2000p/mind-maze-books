const mongoose = require('mongoose');
const Book = require('../models/Book');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function findDuplicates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const dups = await Book.aggregate([
            {
                $group: {
                    _id: { title: "$title", author: "$author" },
                    count: { $sum: 1 },
                    ids: { $push: "$_id" }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]);

        console.log(`Found ${dups.length} groups of duplicate books.`);
        if (dups.length > 0) {
            console.log('Sample duplicates:');
            dups.slice(0, 5).forEach(group => {
                console.log(`- "${group._id.title}" by ${group._id.author}: ${group.count} copies`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findDuplicates();
