import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import { Notification } from "./models/Notification.js";

const app = express();
const port = process.env.PORT || 3003;
const mongoUri =
  process.env.MONGO_URI || "mongodb://localhost:27017/vdt_notifications";

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ service: "notification-service", status: "ok" });
});

app.get("/notifications", async (req, res, next) => {
  try {
    const filter = req.query.userId ? { userId: req.query.userId } : {};
    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

app.post("/notifications", async (req, res, next) => {
  try {
    const { userIds, userId, title, message, type } = req.body;
    const targets = Array.isArray(userIds) && userIds.length > 0 ? userIds : [userId];
    if (!targets[0] || !title || !message) {
      return res.status(400).json({ message: "Thiếu người nhận, tiêu đề hoặc nội dung" });
    }

    const notifications = await Notification.insertMany(
      targets.map((targetUserId) => ({
        userId: targetUserId,
        title,
        message,
        type
      }))
    );
    res.status(201).json(notifications.length === 1 ? notifications[0] : notifications);
  } catch (error) {
    next(error);
  }
});

app.patch("/notifications/:id/read", async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }
    res.json(notification);
  } catch (error) {
    next(error);
  }
});

app.delete("/notifications/:id", async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  res.status(error.status || 500).json({
    message: error.message || "Lỗi không xác định từ dịch vụ thông báo"
  });
});

await mongoose.connect(mongoUri);
app.listen(port, () => {
  console.log(`notification-service listening on ${port}`);
});
