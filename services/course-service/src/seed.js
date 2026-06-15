import mongoose from "mongoose";
import { Course } from "./models/Course.js";

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/vdt_courses";

await mongoose.connect(mongoUri);
await Course.deleteMany({});
await Course.insertMany([
  {
    title: "Monolith to Microservices",
    description: "Kiến trúc, API Gateway, database per service và tư duy event-driven.",
    instructorId: "demo-instructor",
    level: "intermediate",
    lessons: [
      { title: "Monolith là gì?", durationMinutes: 25 },
      { title: "Tách service theo domain", durationMinutes: 35 },
      { title: "API Gateway và giao tiếp nội bộ", durationMinutes: 40 }
    ]
  },
  {
    title: "React Frontend Integration",
    description: "Xây dựng UI gọi API Gateway và hiển thị dữ liệu từ nhiều service.",
    instructorId: "demo-instructor",
    level: "beginner",
    lessons: [
      { title: "Thiết lập Vite", durationMinutes: 20 },
      { title: "Lấy dữ liệu từ API", durationMinutes: 30 }
    ]
  }
]);
await mongoose.disconnect();
console.log("Seeded course-service");
