import mongoose from "mongoose";
import { User } from "./models/User.js";

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/vdt_users";

await mongoose.connect(mongoUri);
await User.deleteMany({});
await User.insertMany([
  {
    fullName: "Admin VDT",
    email: "admin@vdt.edu.vn",
    password: "admin123",
    role: "admin"
  },
  {
    fullName: "Nguyễn Minh Anh",
    email: "minhanh@vdt.edu.vn",
    password: "student123",
    role: "student"
  },
  {
    fullName: "Trần Quang Huy",
    email: "quanghuy@vdt.edu.vn",
    password: "student123",
    role: "instructor"
  },
  {
    fullName: "Lê Thu Hà",
    email: "thuha@vdt.edu.vn",
    password: "student123",
    role: "organizer"
  }
]);
await mongoose.disconnect();
console.log("Seeded user-service");
