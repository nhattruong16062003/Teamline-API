const Notification = require("../models/Notification");

// GET /notifications?cursor=<timestamp>_<id>&limit=10
const getNotifications = async (req, res) => {
  const userId = req.userId;
  const { cursor, limit = 10 } = req.query;

  let query = { receiver: userId, isHidden: false };
  if (cursor) {
    const [time, id] = cursor.split("_");
    query.$or = [
      { createdAt: { $lt: new Date(time) } },
      { createdAt: new Date(time), _id: { $lt: id } },
    ];
  }

  const items = await Notification.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(+limit);

  let nextCursor = null;
  if (items.length === +limit) {
    const last = items[items.length - 1];
    nextCursor = `${last.createdAt.toISOString()}_${last._id}`;
  }

  res.json({ items, nextCursor });
};

module.exports = {
  getNotifications,
};
