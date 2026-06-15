import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import { initEventPublisher, publishCourseEvent } from "./events.js";
import { Course } from "./models/Course.js";

const app = express();
const port = process.env.PORT || 3002;
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/vdt_courses";

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ service: "course-service", status: "ok" });
});

app.get("/courses", async (_req, res, next) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    next(error);
  }
});

app.get("/courses/:id", async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Không tìm thấy khóa học" });
    res.json(course);
  } catch (error) {
    next(error);
  }
});

app.post("/courses", async (req, res, next) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
});

app.patch("/courses/:id", async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!course) return res.status(404).json({ message: "Không tìm thấy khóa học" });
    res.json(course);
  } catch (error) {
    next(error);
  }
});

app.delete("/courses/:id", async (req, res, next) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: "Không tìm thấy khóa học" });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post("/enrollments", async (req, res, next) => {
  try {
    const { courseId, userId } = req.body;
    if (!courseId || !userId) {
      return res.status(400).json({ message: "Thiếu courseId hoặc userId" });
    }

    const course = await Course.findByIdAndUpdate(
      courseId,
      { $addToSet: { enrolledUserIds: userId } },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: "Không tìm thấy khóa học" });

    publishCourseEvent("course.enrollment.created", {
      type: "CourseEnrollmentCreated",
      courseId: course.id,
      userId,
      courseTitle: course.title
    });

    res.status(201).json({
      message: "Đã tạo đăng ký",
      course
    });
  } catch (error) {
    next(error);
  }
});

app.post("/enrollments/complete", async (req, res, next) => {
  try {
    const { courseId, userId } = req.body;
    if (!courseId || !userId) {
      return res.status(400).json({ message: "Thiếu courseId hoặc userId" });
    }

    const course = await Course.findOneAndUpdate(
      { _id: courseId, enrolledUserIds: userId },
      { $addToSet: { completedUserIds: userId } },
      { new: true }
    );
    if (!course) {
      return res.status(404).json({ message: "Không tìm thấy đăng ký khóa học" });
    }

    publishCourseEvent("course.completed", {
      type: "CourseCompleted",
      courseId: course.id,
      userId,
      courseTitle: course.title
    });

    res.json({
      message: "Đã đánh dấu hoàn thành khóa học",
      course
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  res.status(error.status || 500).json({
    message: error.message || "Lỗi không xác định từ dịch vụ khóa học"
  });
});

await mongoose.connect(mongoUri);
await initEventPublisher();
app.listen(port, () => {
  console.log(`course-service listening on ${port}`);
});
