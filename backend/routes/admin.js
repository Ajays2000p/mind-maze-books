const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');
const Book = require('../models/Book');
const Rating = require('../models/Rating');

// Get Global Stats
router.get('/stats', [auth, admin], async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ isAdmin: { $ne: true } });
        const totalBooks = await Book.countDocuments();
        const totalRatings = await Rating.countDocuments();

        // Genre Distribution
        const books = await Book.find({}, 'genres');
        const genreCounts = {};
        books.forEach(b => {
            b.genres.forEach(g => {
                genreCounts[g] = (genreCounts[g] || 0) + 1;
            });
        });

        const genreData = Object.keys(genreCounts).map(name => ({
            name,
            count: genreCounts[name]
        })).sort((a, b) => b.count - a.count).slice(0, 6);

        res.json({
            totalUsers,
            totalBooks,
            totalRatings,
            genreData
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get All Users
router.get('/users', [auth, admin], async (req, res) => {
    try {
        const users = await User.find({ isAdmin: { $ne: true } }).select('-password');
        
        // Efficiently aggregate rating counts for all users in one query
        const ratingCounts = await Rating.aggregate([
            { $group: { _id: "$userId", count: { $sum: 1 } } }
        ]);

        // Create a map for quick lookup
        const countsMap = {};
        ratingCounts.forEach(item => {
            countsMap[item._id.toString()] = item.count;
        });

        const enrichedUsers = users.map(u => ({
            id: u._id,
            name: u.name,
            email: u.email,
            isAdmin: u.isAdmin,
            ratings: countsMap[u._id.toString()] || 0,
            createdAt: u.createdAt
        }));

        res.json(enrichedUsers);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Delete a Rating
router.delete('/ratings/:id', [auth, admin], async (req, res) => {
    try {
        const rating = await Rating.findById(req.params.id);
        if (!rating) return res.status(404).json({ message: 'Rating not found' });

        const bookId = rating.bookId;
        await Rating.findByIdAndDelete(req.params.id);

        // Recalculate book average
        const allRatings = await Rating.find({ bookId });
        const count = allRatings.length;
        const avg = count > 0 ? allRatings.reduce((acc, curr) => acc + curr.value, 0) / count : 0;

        await Book.findByIdAndUpdate(bookId, {
            rating: parseFloat(avg.toFixed(1)),
            ratingCount: count
        });

        res.json({ message: 'Rating removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
