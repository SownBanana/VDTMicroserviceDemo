import amqp from "amqplib";
import { Notification } from "./models/Notification.js";

const rabbitUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const exchangeName = "vdt.events";
const queueName = "notification-service.course-events";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleCourseEvent(event) {
  if (event.type === "CourseEnrollmentCreated") {
    await Notification.create({
      userId: event.userId,
      title: "Đăng ký khóa học thành công",
      message: `Bạn đã đăng ký khóa học ${event.courseTitle}.`,
      type: "course"
    });
    return;
  }

  if (event.type === "CourseCompleted") {
    await Notification.create({
      userId: event.userId,
      title: "Đã hoàn thành khóa học",
      message: `Bạn đã hoàn thành khóa học ${event.courseTitle}.`,
      type: "course"
    });
  }
}

export async function startCourseEventConsumer(retries = 30) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const connection = await amqp.connect(rabbitUrl);
      const channel = await connection.createChannel();
      await channel.assertExchange(exchangeName, "topic", { durable: true });
      await channel.assertQueue(queueName, { durable: true });
      await channel.bindQueue(queueName, exchangeName, "course.#");
      await channel.prefetch(10);

      await channel.consume(queueName, async (message) => {
        if (!message) return;

        try {
          const event = JSON.parse(message.content.toString());
          await handleCourseEvent(event);
          channel.ack(message);
        } catch (error) {
          console.error("Failed to process course event", error);
          channel.nack(message, false, false);
        }
      });

      connection.on("close", () => {
        startCourseEventConsumer().catch((error) => {
          console.error("RabbitMQ consumer reconnect failed", error);
        });
      });

      console.log("notification-service consuming RabbitMQ course events");
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`RabbitMQ consumer not ready, retry ${attempt}/${retries}`);
      await wait(2000);
    }
  }
}
