import amqp from "amqplib";

const rabbitUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const exchangeName = "vdt.events";

let channel;

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function initEventPublisher(retries = 30) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const connection = await amqp.connect(rabbitUrl);
      channel = await connection.createChannel();
      await channel.assertExchange(exchangeName, "topic", { durable: true });

      connection.on("close", () => {
        channel = undefined;
        initEventPublisher().catch((error) => {
          console.error("RabbitMQ publisher reconnect failed", error);
        });
      });

      console.log("course-service connected to RabbitMQ");
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`RabbitMQ publisher not ready, retry ${attempt}/${retries}`);
      await wait(2000);
    }
  }
}

export function publishCourseEvent(routingKey, payload) {
  if (!channel) {
    throw new Error("RabbitMQ publisher is not ready");
  }

  channel.publish(
    exchangeName,
    routingKey,
    Buffer.from(
      JSON.stringify({
        ...payload,
        occurredAt: new Date().toISOString()
      })
    ),
    {
      contentType: "application/json",
      persistent: true
    }
  );
}
