/**
 * seed_recommended_ratings.js
 *
 * Target: Books with DB `rating` between 3.0 and 4.0 (the "Recommended for You" carousel).
 * Goal  : Ensure each such book has 100-150 actual Rating documents.
 *         New ratings are distributed so the average stays between 3.0 and 4.0.
 *         Only EXISTING users (up to 1,500) are used.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Book = require('../models/Book');
const Rating = require('../models/Rating');
require('dotenv').config({ path: '../.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mind_maze_books';

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a random integer in [min, max] inclusive.
 */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Generates an array of `n` rating values (1-5) whose average lies in [targetAvgMin, targetAvgMax].
 * Strategy: pick values uniformly from {3, 4} so the average is guaranteed to be ~3.5 (inside 3.0-4.0).
 * We add a small percentage of 2s and 5s in a controlled way to keep variety while staying in range.
 */
function generateRatingValues(n, targetAvgMin = 3.0, targetAvgMax = 4.0) {
    // We'll use the midpoint 3.0-4.0 = 3.5 as the ideal average.
    // Distribute as roughly: 10% → 2, 30% → 3, 30% → 4, 20% → 4, 10% → 3  …
    // Simpler: produce values from the set [3, 4] with equal probability → avg = 3.5 ✓
    // Spice it up: allow ~10% to be 2 and ~10% to be 5; the average effect:
    //   avg = 0.1*2 + 0.4*3 + 0.4*4 + 0.1*5 = 0.2 + 1.2 + 1.6 + 0.5 = 3.5  ✓
    const values = [];
    for (let i = 0; i < n; i++) {
        const r = Math.random();
        if (r < 0.10) values.push(2);        // 10 %
        else if (r < 0.50) values.push(3);   // 40 %
        else if (r < 0.90) values.push(4);   // 40 %
        else values.push(5);                  // 10 %
    }
    // Safety check: clamp average into range
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    if (avg < targetAvgMin || avg > targetAvgMax) {
        // Shouldn't happen with the distribution above, but just in case ─ regenerate
        return generateRatingValues(n, targetAvgMin, targetAvgMax);
    }
    return values;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log('✅  Connected to MongoDB');

    // 1. Load all users (capped at 1500 as per spec)
    const allUsers = await User.find({}, '_id').limit(1500).lean();
    if (allUsers.length === 0) {
        console.error('❌  No users found in the database. Aborting.');
        process.exit(1);
    }
    console.log(`👤  Using ${allUsers.length} users`);

    // 2. Load target books (rating in [3.0, 4.0])
    const targetBooks = await Book.find({ rating: { $gte: 3.0, $lte: 4.0 } }, '_id title rating ratingCount').lean();
    console.log(`📚  Found ${targetBooks.length} books in the 3.0-4.0 rating range`);

    // 3. For each book, top-up its Rating documents to [100, 150]
    let totalInserted = 0;
    let booksDone = 0;
    let booksSkipped = 0;

    for (const book of targetBooks) {
        // Count existing real ratings
        const existingCount = await Rating.countDocuments({ bookId: book._id });

        const targetCount = randInt(100, 150);

        if (existingCount >= targetCount) {
            // Already has enough real ratings
            booksSkipped++;
            continue;
        }

        const needed = targetCount - existingCount;

        // Build a set of user IDs that have already rated this book
        const existingRatings = await Rating.find({ bookId: book._id }, 'userId').lean();
        const ratedUserIds = new Set(existingRatings.map(r => r.userId.toString()));

        // Pick `needed` distinct users who haven't rated this book yet
        const eligibleUsers = allUsers.filter(u => !ratedUserIds.has(u._id.toString()));

        if (eligibleUsers.length < needed) {
            console.warn(`  ⚠️  Book "${book.title}": need ${needed} more ratings but only ${eligibleUsers.length} unused users available. Using all of them.`);
        }

        const usersToAssign = eligibleUsers.slice(0, needed);
        const ratingValues = generateRatingValues(usersToAssign.length);

        const ratingsToInsert = usersToAssign.map((u, i) => ({
            userId: u._id,
            bookId: book._id,
            value: ratingValues[i],
        }));

        if (ratingsToInsert.length === 0) {
            booksSkipped++;
            continue;
        }

        await Rating.insertMany(ratingsToInsert, { ordered: false });

        // Recompute and persist new average + count directly on the Book document
        const allRatings = await Rating.find({ bookId: book._id }, 'value').lean();
        const newCount = allRatings.length;
        const newAvg = allRatings.reduce((s, r) => s + r.value, 0) / newCount;
        const roundedAvg = Math.round(newAvg * 10) / 10;

        await Book.findByIdAndUpdate(book._id, {
            ratingCount: newCount,
            rating: roundedAvg,
        });

        totalInserted += ratingsToInsert.length;
        booksDone++;

        if (booksDone % 50 === 0) {
            console.log(`  ⏳  Processed ${booksDone} books …`);
        }
    }

    console.log('\n✅  Done!');
    console.log(`   Books updated    : ${booksDone}`);
    console.log(`   Books skipped    : ${booksSkipped} (already had ≥ 100 ratings)`);
    console.log(`   Ratings inserted : ${totalInserted}`);

    process.exit(0);
}

main().catch(err => {
    console.error('❌  Fatal error:', err);
    process.exit(1);
});
