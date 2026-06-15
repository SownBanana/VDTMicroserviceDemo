import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    durationMinutes: { type: Number, default: 30 }
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    instructorId: { type: String, required: true },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner"
    },
    lessons: [lessonSchema],
    enrolledUserIds: [{ type: String }],
    completedUserIds: [{ type: String }]
  },
  { timestamps: true }
);

export const Course = mongoose.model("Course", courseSchema);
