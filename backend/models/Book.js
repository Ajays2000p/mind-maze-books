const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    genres: [{ type: String }],
    description: { type: String },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    popularityScore: { type: Number, default: 0, set: v => Math.floor(v || 0) },
    thumbnailUrl: { type: String },
    URL: { type: String },
    publishedDate: { type: String },
    pages: { type: Number },
}, { timestamps: true });

bookSchema.index({ title: 1, author: 1 }, { unique: true });
bookSchema.index({ title: 'text', author: 'text', genres: 'text' });

// Middleware to cascade delete ratings when a book is deleted one-by-one
bookSchema.pre('findOneAndDelete', async function () {
    const doc = await this.model.findOne(this.getQuery());
    if (doc) {
        const Rating = mongoose.model('Rating');
        await Rating.deleteMany({ bookId: doc._id });
    }
});

// Middleware to cascade delete ratings when multiple books are deleted
bookSchema.pre('deleteMany', async function () {
    const docs = await this.model.find(this.getQuery());
    if (docs && docs.length > 0) {
        const bookIds = docs.map(d => d._id);
        const Rating = mongoose.model('Rating');
        await Rating.deleteMany({ bookId: { $in: bookIds } });
    }
});

module.exports = mongoose.model('Book', bookSchema);
