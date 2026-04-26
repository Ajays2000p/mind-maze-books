const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');
const Book = require('../models/Book');
const mongoose = require('mongoose');
const { getStableMetrics } = require('../utils/bookHelpers');

// @route   GET /api/rankings/most-rated
// @desc    Get top 10 most rated books
router.get('/most-rated', async (req, res) => {
    try {
        const topRatedBooks = await Rating.aggregate([
            {
                $group: {
                    _id: "$bookId",
                    ratingCount: { $sum: 1 },
                    averageRating: { $avg: "$value" }
                }
            },
            {
                $sort: { ratingCount: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: "books", // Should match the collection name in MongoDB
                    localField: "_id",
                    foreignField: "_id",
                    as: "bookDetails"
                }
            },
            {
                $unwind: "$bookDetails"
            },
            {
                $project: {
                    _id: 1,
                    ratingCount: 1,
                    averageRating: { $round: ["$averageRating", 1] },
                    title: "$bookDetails.title",
                    author: "$bookDetails.author",
                    thumbnailUrl: "$bookDetails.thumbnailUrl",
                    genres: "$bookDetails.genres"
                }
            }
        ]);

        res.json(topRatedBooks);
    } catch (error) {
        console.error('Error fetching most rated books:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/rankings/top-rated
// @desc    Get books sorted by highest average rating, with optional genre filter or multi-genre filter
router.get('/top-rated', async (req, res) => {
    try {
        const { genre, multiGenre } = req.query;

        const aggregationPipeline = [
            {
                $group: {
                    _id: "$bookId",
                    ratingCount: { $sum: 1 },
                    averageRating: { $avg: "$value" }
                }
            },
            {
                $match: {
                    ratingCount: { $gte: 1 }
                }
            },
            {
                $lookup: {
                    from: "books",
                    localField: "_id",
                    foreignField: "_id",
                    as: "bookDetails"
                }
            },
            {
                $unwind: "$bookDetails"
            }
        ];

        // Enforce genre constraints
        if (multiGenre === 'true') {
            // Must have more than 1 genre
            aggregationPipeline.push({
                $match: {
                    "bookDetails.genres.1": { $exists: true }
                }
            });
        } else if (genre) {
            aggregationPipeline.push({
                $match: {
                    "bookDetails.genres": { $size: 1, $all: [genre] }
                }
            });
        } else {
            aggregationPipeline.push({
                $match: {
                    "bookDetails.genres": { $size: 1 }
                }
            });
        }

        // Add sorting, limiting and projection
        aggregationPipeline.push(
            {
                $sort: { averageRating: -1, ratingCount: -1 }
            },
            {
                $limit: 10
            },
            {
                $project: {
                    _id: 1,
                    title: "$bookDetails.title",
                    author: "$bookDetails.author",
                    thumbnailUrl: "$bookDetails.thumbnailUrl",
                    genres: "$bookDetails.genres"
                }
            }
        );

        const topRatedBooks = await Rating.aggregate(aggregationPipeline);

        // Inject stable metrics deterministically only if we have sparse real data
        const enrichedBooks = topRatedBooks.map(book => {
            if (book.ratingCount >= 100) {
                // Return real values if heavily rated
                return {
                    ...book,
                    averageRating: Math.round(book.averageRating * 10) / 10,
                };
            }

            const metrics = getStableMetrics(book._id);
            return {
                ...book,
                averageRating: metrics.rating,
                ratingCount: metrics.ratingCount
            };
        });

        res.json(enrichedBooks);
    } catch (error) {
        console.error('Error fetching top rated books:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
