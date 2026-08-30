const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Rating = require('../models/Rating');
const Book = require('../models/Book');

const { getUserAnalyticsHelper } = require('../utils/userAnalytics');

// Get User Profile with Analytics
router.get('/profile', auth, async (req, res) => {
    try {
        const data = await getUserAnalyticsHelper(req.user.id);
        if (!data) return res.status(404).json({ message: 'User not found' });
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update User Profile (Name / Avatar)
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, avatarUrl } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name !== undefined) {
            const cleanName = String(name).trim();
            if (!cleanName) {
                return res.status(400).json({ message: 'Full name cannot be empty' });
            }
            user.name = cleanName;
        }

        if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

        await user.save();
        res.json({ 
            message: 'Profile updated successfully', 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                avatarUrl: user.avatarUrl, 
                isAdmin: user.isAdmin 
            } 
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Request OTP for Email Change
router.post('/request-email-change-otp', auth, async (req, res) => {
    try {
        const { newEmail } = req.body;
        if (!newEmail || !String(newEmail).trim()) {
            return res.status(400).json({ message: 'New email address is required.' });
        }

        const cleanEmail = String(newEmail).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ message: 'Please enter a valid email address.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (cleanEmail === user.email.toLowerCase()) {
            return res.status(400).json({ message: 'New email address must be different from your current email.' });
        }

        const existingUser = await User.findOne({ email: cleanEmail, _id: { $ne: req.user.id } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered to another account.' });
        }

        user.pendingEmail = cleanEmail;
        user.emailChangeLastResend = new Date();

        await user.save();

        res.json({
            message: 'OTP verification code sent to your new email address.',
            pendingEmail: cleanEmail,
            cooldownSeconds: 30
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Verify OTP & Update Email Address (Demo Mode: Accepts any 6-digit OTP)
router.post('/verify-email-change-otp', auth, async (req, res) => {
    try {
        const { otp, newName } = req.body;
        const cleanOtp = String(otp || '').trim();
        if (!cleanOtp || cleanOtp.length !== 6) {
            return res.status(400).json({ message: 'Please enter a 6-digit verification code.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (!user.pendingEmail) {
            return res.status(400).json({ message: 'No email change request found. Please request a new OTP.' });
        }

        // Final check that pendingEmail is still free
        const existingUser = await User.findOne({ email: user.pendingEmail, _id: { $ne: req.user.id } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered to another account.' });
        }

        // Apply email update (Accepts any 6-digit OTP entered by the user)
        user.email = user.pendingEmail;
        if (newName && String(newName).trim()) {
            user.name = String(newName).trim();
        }

        // Clear OTP state
        user.pendingEmail = "";
        user.emailChangeOtp = "";
        user.emailChangeOtpExpires = null;
        user.emailChangeLastResend = null;

        await user.save();

        res.json({
            message: 'Email address updated successfully.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
                isAdmin: user.isAdmin
            }
        });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'Email is already registered to another account.' });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update User Favorite Genres (Onboarding)
router.put('/favorite-genres', auth, async (req, res) => {
    try {
        const { genres } = req.body;
        if (!Array.isArray(genres) || genres.length < 3) {
            return res.status(400).json({ message: 'Please select at least 3 genres.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Take ONLY the first 3 genres selected by the user
        const firstThreeGenres = genres.slice(0, 3);
        user.favoriteGenres = firstThreeGenres;

        await user.save();

        res.json({
            message: 'Favorite genres updated successfully',
            favoriteGenres: user.favoriteGenres,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
                favoriteGenres: user.favoriteGenres,
                isAdmin: user.isAdmin
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get User Bookmark, Favorite, Finished & Not Interested Status for a Book
router.get('/book-status/:bookId', auth, async (req, res) => {
    try {
        const { bookId } = req.params;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isBookmarked = Array.isArray(user.bookmarks) && user.bookmarks.includes(String(bookId));
        const isFavorite = Array.isArray(user.favorites) && user.favorites.includes(String(bookId));
        const isFinished = Array.isArray(user.finishedBooks) && user.finishedBooks.includes(String(bookId));
        const isNotInterested = Array.isArray(user.notInterestedBooks) && user.notInterestedBooks.includes(String(bookId));

        res.json({ isBookmarked, isFavorite, isFinished, isNotInterested });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Toggle Not Interested Status for a Book
router.post('/toggle-not-interested', auth, async (req, res) => {
    try {
        const { bookId } = req.body;
        if (!bookId) return res.status(400).json({ message: 'Book ID is required' });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!Array.isArray(user.notInterestedBooks)) user.notInterestedBooks = [];

        const index = user.notInterestedBooks.indexOf(String(bookId));
        let isNotInterested = false;

        if (index > -1) {
            user.notInterestedBooks.splice(index, 1);
            isNotInterested = false;
        } else {
            user.notInterestedBooks.push(String(bookId));
            isNotInterested = true;
        }

        await user.save();
        res.json({ 
            isNotInterested, 
            message: isNotInterested ? 'Marked as Not Interested' : 'Removed from Not Interested' 
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Toggle Bookmark Status for a Book
router.post('/toggle-bookmark', auth, async (req, res) => {
    try {
        const { bookId } = req.body;
        if (!bookId) return res.status(400).json({ message: 'Book ID is required' });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!Array.isArray(user.bookmarks)) user.bookmarks = [];

        const index = user.bookmarks.indexOf(String(bookId));
        let isBookmarked = false;

        if (index > -1) {
            user.bookmarks.splice(index, 1);
            isBookmarked = false;
        } else {
            user.bookmarks.push(String(bookId));
            isBookmarked = true;
        }

        await user.save();
        res.json({ 
            isBookmarked, 
            message: isBookmarked ? 'Bookmarked successfully' : 'Removed from bookmarks' 
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Toggle Favorite Status for a Book
router.post('/toggle-favorite', auth, async (req, res) => {
    try {
        const { bookId } = req.body;
        if (!bookId) return res.status(400).json({ message: 'Book ID is required' });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!Array.isArray(user.favorites)) user.favorites = [];

        const index = user.favorites.indexOf(String(bookId));
        let isFavorite = false;

        if (index > -1) {
            user.favorites.splice(index, 1);
            isFavorite = false;
        } else {
            user.favorites.push(String(bookId));
            isFavorite = true;
        }

        await user.save();
        res.json({ 
            isFavorite, 
            message: isFavorite ? 'Added to favorites' : 'Removed from favorites' 
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Toggle Finished Status for a Book
router.post('/toggle-finished', auth, async (req, res) => {
    try {
        const { bookId } = req.body;
        if (!bookId) return res.status(400).json({ message: 'Book ID is required' });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!Array.isArray(user.finishedBooks)) user.finishedBooks = [];
        if (!Array.isArray(user.bookmarks)) user.bookmarks = [];

        const index = user.finishedBooks.indexOf(String(bookId));
        let isFinished = false;
        let isBookmarked = user.bookmarks.includes(String(bookId));

        if (index > -1) {
            // Undo Finished status
            user.finishedBooks.splice(index, 1);
            isFinished = false;
        } else {
            // Mark as Finished
            user.finishedBooks.push(String(bookId));
            isFinished = true;

            // Automatically remove from bookmarks if present
            const bmIndex = user.bookmarks.indexOf(String(bookId));
            if (bmIndex > -1) {
                user.bookmarks.splice(bmIndex, 1);
                isBookmarked = false;
            }
        }

        await user.save();
        res.json({ 
            isFinished, 
            isBookmarked,
            message: isFinished ? 'Marked as finished' : 'Removed from finished' 
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get User Bookshelf (Bookmarked and Favorite books)
router.get('/bookshelf', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const bookmarkIds = Array.isArray(user.bookmarks) ? user.bookmarks : [];
        const favoriteIds = Array.isArray(user.favorites) ? user.favorites : [];

        // Fetch full book objects safely
        const rawBookmarked = await Promise.all(bookmarkIds.map(id => Book.findById(id).lean()));
        const rawFavorites = await Promise.all(favoriteIds.map(id => Book.findById(id).lean()));

        const bookmarkedBooks = rawBookmarked.filter(Boolean);
        const favoriteBooks = rawFavorites.filter(Boolean);

        // Helper to map book fields to match frontend BookCard structure
        const mapBook = (b) => ({
            ...b,
            id: b._id,
            genre: b.genres || [],
            coverUrl: b.realCoverImage || b.thumbnailUrl || '/placeholder.svg',
            averageRating: b.rating || 0,
            ratingCount: b.ratingCount || 0
        });

        res.json({
            bookmarkedBooks: bookmarkedBooks.map(mapBook),
            favoriteBooks: favoriteBooks.map(mapBook)
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
