/**
 * routes/recommended.js
 * Dedicated route for the "Recommended for You" carousel.
 * Mounted at /api/recommended in server.js
 * Completely isolated from /api/books to avoid /:id route conflicts.
 */
const express = require('express');
const router = express.Router();

// GET /api/recommended/section
// Returns books with real averageRating [3.0, 4.0] and ratingCount [100, 150]
router.get('/section', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;

        const results = await db.collection('ratings').aggregate([
            { $group: { _id: '$bookId', ratingCount: { $sum: 1 }, averageRating: { $avg: '$value' } } },
            { $match: { ratingCount: { $gte: 100, $lte: 150 }, averageRating: { $gte: 3.0, $lte: 4.0 } } },
            { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'bookDetails' } },
            { $unwind: '$bookDetails' },
            {
                $project: {
                    _id: 1,
                    ratingCount: 1,
                    averageRating: { $round: ['$averageRating', 1] },
                    title: '$bookDetails.title',
                    author: '$bookDetails.author',
                    thumbnailUrl: '$bookDetails.thumbnailUrl',
                    genres: '$bookDetails.genres',
                    popularityScore: '$bookDetails.popularityScore',
                    description: '$bookDetails.description',
                    publishedDate: '$bookDetails.publishedDate',
                    pages: '$bookDetails.pages'
                }
            }
        ]).toArray();

        // In-memory shuffle → return up to 20 random books
        for (let i = results.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [results[i], results[j]] = [results[j], results[i]];
        }

        res.json(results.slice(0, 20));
    } catch (err) {
        console.error('Error fetching recommended section:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
