function getCappedDate(baseDate, offsetDays, maxDate) {
  const target = new Date(baseDate.getTime() + offsetDays * 86400000);
  return new Date(Math.min(target.getTime(), maxDate.getTime()));
}

function getNotiMaxLifetime(createdAt) {
  return new Date(createdAt.getTime() + 30 * 86400000); // 30 ngày từ tạo
}

function updateHiddenAndExpire({ noti, action }) {
  console.log("du lieu noti", noti);
  const now = new Date();
  const maxLife = getNotiMaxLifetime(noti.createdAt);

  if (action === "read") {
    noti.isRead = true;
    noti.readAt = now;
    noti.hiddenAt = getCappedDate(now, 15, maxLife);
  }
  if (action === "hide") {
    noti.isHidden = true;
    noti.hiddenAt = now;
  }

  if (noti.hiddenAt) {
    noti.expireAt = getCappedDate(noti.hiddenAt, 7, maxLife);
  } else {
    noti.expireAt = maxLife;
  }

  return noti;
}

module.exports = {
  getCappedDate,
  updateHiddenAndExpire,
};
