import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import { User } from "./models/User.js";

const app = express();
const port = process.env.PORT || 3001;
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/vdt_users";

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ service: "user-service", status: "ok" });
});

function toPublicUser(user) {
  const data = user.toObject ? user.toObject() : user;
  delete data.password;
  return data;
}

app.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || user.password !== password || user.status !== "active") {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    res.json({
      token: `demo-token-${user._id}`,
      user: toPublicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/users", async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

app.get("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.post("/users", async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

app.patch("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.delete("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  res.status(error.status || 500).json({
    message: error.message || "Lỗi không xác định từ dịch vụ người dùng"
  });
});

await mongoose.connect(mongoUri);
app.listen(port, () => {
  console.log(`user-service listening on ${port}`);
});
