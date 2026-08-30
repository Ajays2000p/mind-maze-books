const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    favoriteGenres: { type: [String], default: [] },
    isAdmin: { type: Boolean, default: false },
    isMock: { type: Boolean, default: false },
    pendingEmail: { type: String, default: "" },
    emailChangeOtp: { type: String, default: "" },
    emailChangeOtpExpires: { type: Date, default: null },
    emailChangeLastResend: { type: Date, default: null },
    bookmarks: [{ type: String, default: [] }],
    favorites: [{ type: String, default: [] }],
    finishedBooks: [{ type: String, default: [] }],
    notInterestedBooks: [{ type: String, default: [] }],
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

module.exports = mongoose.model('User', userSchema);
