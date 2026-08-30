const User = require('../models/User');
const Rating = require('../models/Rating');

async function getUserAnalyticsHelper(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user) return null;

    const allRatings = await Rating.find({ userId: user._id }).populate('bookId');
    const ratings = allRatings.filter(r => r.bookId);

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

    return {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            favoriteGenres: user.favoriteGenres
        },
        ratings: ratings.filter(r => r.bookId).map(r => ({
            id: r._id,
            rating: r.value,
            createdAt: r.createdAt ? r.createdAt.toISOString().split('T')[0] : '',
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
    };
}

module.exports = { getUserAnalyticsHelper };
