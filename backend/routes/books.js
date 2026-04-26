const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { getStableMetrics } = require('../utils/bookHelpers');
const { generateCover } = require('../utils/coverGenerator');

// ─────────────────────────────────────────────────────────
// STATIC NAMED ROUTES  (must be before any /:id param route)
// ─────────────────────────────────────────────────────────

// GET /api/books/search
// Exact match search for Admin Panel
router.get('/search', async (req, res) => {
    try {
        const query = (req.query.query || '').trim();
        if (!query) return res.json([]);

        const books = await Book.find({
            $or: [
                { title: { $regex: `^${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
                { author: { $regex: `^${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
            ]
        });

        res.json(books);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/books/home-search
// Exclusive multi-field search for the Home Page Navbar
router.get('/home-search', async (req, res) => {
    try {
        const { query, limit = 20 } = req.query;
        if (!query) return res.json([]);

        const cleanQuery = query.trim();
        if (!cleanQuery) return res.json([]);

        // Strict exact match using anchored regex (case-insensitive)
        const books = await Book.find({
            $or: [
                { title: { $regex: `^${cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
                { author: { $regex: `^${cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
            ]
        }).limit(parseInt(limit));

        res.json(books);
    } catch (err) {
        console.error('Error in home-search:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/books/personalized-recommendations
// Returns personalized books for logged-in users who have rated >= 10 books
router.get('/personalized-recommendations', auth, async (req, res) => {
    try {
        const Rating = require('../models/Rating');
        const mongoose = require('mongoose');
        const userId = new mongoose.Types.ObjectId(req.user.id);

        // 1. Get user rating count
        const userRatings = await Rating.find({ userId }).populate('bookId');
        if (userRatings.length < 10) {
            return res.json({ 
                books: [], 
                ratedBooksCount: userRatings.length,
                thresholdMet: false 
            });
        }

        // 2. Identify top genres
        const genreWeights = {};
        userRatings.forEach(r => {
            if (r.bookId && r.bookId.genres) {
                r.bookId.genres.forEach(g => {
                    genreWeights[g] = (genreWeights[g] || 0) + 1;
                });
            }
        });

        const topGenres = Object.keys(genreWeights)
            .sort((a, b) => genreWeights[b] - genreWeights[a])
            .slice(0, 3);

        // 3. Find candidate books
        const alreadyRatedIds = userRatings.map(r => r.bookId._id);
        
        const recommendations = await Book.find({
            genres: { $in: topGenres },
            _id: { $not: { $in: alreadyRatedIds } },
            rating: { $gte: 3.5 }
        })
        .sort({ rating: -1, popularityScore: -1 })
        .limit(20);

        res.json({
            books: recommendations,
            ratedBooksCount: userRatings.length,
            thresholdMet: true
        });
    } catch (err) {
        console.error('Personalized recommend error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/books/recommended-section
// Returns books with real averageRating in [3.0, 4.0] and ratingCount in [100, 150]
// Used exclusively by the "Recommended for You" carousel.  Isolated from Top Rated.
router.get('/recommended-section', async (req, res) => {
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

        // In-memory Fisher-Yates shuffle then return up to 20
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

// ─────────────────────────────────────────────────────────
// COLLECTION ROUTES
// ─────────────────────────────────────────────────────────

// Get all books with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const { genre, search, page = 1, limit = 20, strict = false, duo = false, multi = false } = req.query;
        const query = {};

        if (genre) {
            const genresArray = genre.split(',').filter(g => g.trim() !== '');
            if (genresArray.length === 1) {
                if (strict === 'true' || strict === true) {
                    // Exact match: only ONE genre in the array, and it must be the selected one
                    query.genres = { $size: 1, $all: [genresArray[0]] };
                } else if (duo === 'true' || duo === true) {
                    // Duo match: exactly TWO genres in the array, one must be the selected one
                    query.genres = { $size: 2, $all: [genresArray[0]] };
                } else {
                    // Standard match: contains the selected genre (among others)
                    query.genres = genresArray[0];
                }
            } else if (genresArray.length > 0) {
                const matchMode = req.query.matchMode || 'all';
                if (matchMode === 'any') {
                    query.genres = { $in: genresArray };
                } else {
                    query.genres = { $all: genresArray };
                }
            }
        }

        if (search) {
            const cleanSearch = search.trim();
            if (cleanSearch) {
                // Strict exact match using anchored regex (case-insensitive)
                query.$or = [
                    { title: { $regex: `^${cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
                    { author: { $regex: `^${cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
                ];
            }
        }

        const books = await Book.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await Book.countDocuments(query);
        res.json({
            books,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Create Book (Admin)
router.post('/', [auth, admin], async (req, res) => {
    try {
        const newBook = new Book(req.body);
        const book = await newBook.save();
        res.status(201).json(book);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ─────────────────────────────────────────────────────────
// PARAM :id ROUTES  (must come after all static named routes)
// ─────────────────────────────────────────────────────────

// Get book by ID
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).lean();
        if (!book) return res.status(404).json({ message: 'Book not found' });

        const Rating = require('../models/Rating');
        const count = await Rating.countDocuments({ bookId: book._id });

        let finalRating = book.rating;
        let finalCount = book.ratingCount;

        if (count >= 100) {
            const bookRatings = await Rating.find({ bookId: book._id });
            const avg = bookRatings.reduce((acc, curr) => acc + curr.value, 0) / count;
            finalRating = Math.round(avg * 10) / 10;
            finalCount = count;
        } else {
            const metrics = getStableMetrics(book._id);
            finalRating = metrics.rating;
            finalCount = metrics.ratingCount;
        }

        const enrichedBook = {
            ...book,
            rating: finalRating,
            ratingCount: finalCount,
            dbRating: book.rating
        };

        res.json(enrichedBook);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Generate and cache an AI cover for a book
router.post('/:id/generate-cover', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: 'Book not found' });

        // Return early if we already have an AI-generated cover
        if (book.thumbnailUrl && book.thumbnailUrl.startsWith('data:image/svg')) {
            return res.json({ thumbnailUrl: book.thumbnailUrl, cached: true });
        }

        const newCoverUri = await generateCover(book.title, book.author);

        // Update the book
        book.thumbnailUrl = newCoverUri;
        await book.save();

        res.json({ thumbnailUrl: newCoverUri, cached: false });
    } catch (err) {
        console.error("Cover generation failed:", err);
        res.status(500).json({ message: 'Failed to generate cover', error: err.message });
    }
});

// Update Book (Admin)
router.put('/:id', [auth, admin], async (req, res) => {
    try {
        const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!book) return res.status(404).json({ message: 'Book not found' });
        res.json(book);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Delete Book (Admin)
router.delete('/:id', [auth, admin], async (req, res) => {
    try {
        const bookId = req.params.id;

        // 1. Manually cascade delete associated ratings first
        const mongoose = require('mongoose');
        const Rating = mongoose.model('Rating');
        await Rating.deleteMany({ bookId: bookId });

        // 2. Delete the actual book
        const book = await Book.findByIdAndDelete(bookId);
        if (!book) return res.status(404).json({ message: 'Book not found' });

        res.json({ message: 'Book and associated ratings completely deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
