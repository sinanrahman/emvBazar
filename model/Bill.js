const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    item: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    unitPrice: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    }
});

const billSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    items: [itemSchema],
    totalAmount: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        enum: ['purchase', 'payment'],
        default: 'purchase'
    }
}, {
    timestamps: true
});

// Calculate total amount before saving
billSchema.pre('save', function () {
    this.totalAmount = this.items.reduce((total, item) => total + item.amount, 0);
});

module.exports = mongoose.model('Bill', billSchema);
