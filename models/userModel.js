const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String, default: '' },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    active: { type: Boolean, default: true },
    // 2FA is opt-in — twoFactorEnabled defaults false, so every existing account keeps logging
    // in exactly as before until they explicitly turn it on for themselves.
    twoFactorSecret: { type: String, default: '' },
    twoFactorEnabled: { type: Boolean, default: false },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
