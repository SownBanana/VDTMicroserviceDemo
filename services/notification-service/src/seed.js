import mongoose from "mongoose";
import { Notification } from "./models/Notification.js";

const mongoUri =
  process.env.MONGO_URI || "mongodb://localhost:27017/vdt_notifications";

await mongoose.connect(mongoUri);
await Notification.deleteMany({});
await mongoose.disconnect();
console.log("Seeded notification-service");
