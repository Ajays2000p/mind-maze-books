/**
 * Deterministic helper to generate stable "demo" ratings and counts
 * based on MongoDB ObjectIds. This ensures consistency across different API calls.
 */
const getStableMetrics = (id) => {
    if (!id) return { rating: 4.5, ratingCount: 150 };

    const idStr = id.toString();
    const lastChar = idStr[idStr.length - 1];
    const lastTwo = idStr.slice(-2);

    // Generate a rating between 4.3 and 5.0
    // parseInt(lastChar, 16) gives 0-15. We want 0-7 to map to 0.0-0.7.
    const ratingBase = (parseInt(lastChar, 16) % 8) * 0.1;
    const rating = 4.3 + ratingBase;

    // Generate a count between 100 and 300
    // parseInt(lastTwo, 16) gives 0-255.
    const count = (parseInt(lastTwo, 16) % 201) + 100;

    return {
        rating: Math.round(rating * 10) / 10,
        ratingCount: count
    };
};

module.exports = { getStableMetrics };
