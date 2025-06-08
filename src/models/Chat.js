const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['private', 'group'], default: 'private' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  allowChat: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
