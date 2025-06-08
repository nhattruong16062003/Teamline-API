const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    question: String,
    options: [String],
    votes: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        optionIndex: Number
    }],
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Poll', pollSchema);
