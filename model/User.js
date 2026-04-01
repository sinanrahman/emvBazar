const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        unique:true
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        unique:true
    },
    type: {
        type: String,
        enum: ['monthly', 'fixed', 'uncertain'],
        default: 'monthly'
    },
    status: {
        type: String,
        enum: ['paid', 'unpaid'],
        default: 'unpaid'
    },
    dueDate: {
        type: Date
    },
    nextReminderDate: {
        type: Date
    },
    reminderIntervalDays: {
        type: Number,
        default: 10
    },
    reminderActive: {
        type: Boolean,
        default: true
    },
    billNeeded: {
        type: Boolean,
        default: false
    },
    whatsappOptIn: {
        type: Boolean,
        default: false
    },
    whatsappOptInAt: {
        type: Date
    }
}, {
    timestamps: true
});

userSchema.pre('save', function (next) {

    if (this.isModified('type')) {

        if (this.type === 'monthly') {
            this.reminderIntervalDays = 30;
            this.nextReminderDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }

        if (this.type === 'uncertain') {
            this.reminderIntervalDays = 10;
            this.nextReminderDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
        }

        if (this.type === 'fixed') {
            this.reminderIntervalDays = null;
            this.nextReminderDate = this.dueDate;
        }
    }

});

module.exports = mongoose.model('User', userSchema);
