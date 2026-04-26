const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Rating = require('../models/Rating');
const Book = require('../models/Book');

// Get User Profile with Analytics
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const ratings = await Rating.find({ userId: user._id }).populate('bookId');

        // Calculate Analytics
        const genreCounts = {};
        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        ratings.forEach(r => {
            ratingCounts[r.value]++;
            if (r.bookId && r.bookId.genres) {
                r.bookId.genres.forEach(g => {
                    genreCounts[g] = (genreCounts[g] || 0) + 1;
                });
            }
        });

        const genrePreference = Object.keys(genreCounts).map(name => ({
            name,
            value: genreCounts[name]
        })).sort((a, b) => b.value - a.value).slice(0, 5);

        const ratingDistribution = Object.keys(ratingCounts).map(stars => ({
            stars: `${stars}★`,
            count: ratingCounts[stars]
        }));

        res.json({
            user,
            ratings: ratings.map(r => ({
                id: r._id,
                rating: r.value,
                createdAt: r.createdAt.toISOString().split('T')[0],
                book: {
                    id: r.bookId._id,
                    title: r.bookId.title,
                    author: r.bookId.author,
                    coverUrl: r.bookId.thumbnailUrl
                }
            })),
            analytics: {
                genrePreference,
                ratingDistribution
            },
            ratedBooksCount: ratings.length
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update User Profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, email, avatarUrl } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name) user.name = name;
        if (email) user.email = email;
        if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

        await user.save();
        res.json({ message: 'Profile updated successfully', user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin } });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'Email already exists' });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
