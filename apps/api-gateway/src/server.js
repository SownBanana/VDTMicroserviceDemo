import axios from "axios";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import morgan from "morgan";

const app = express();
const port = process.env.PORT || 8080;

const services = {
  users: process.env.USER_SERVICE_URL || "http://localhost:3001",
  courses: process.env.COURSE_SERVICE_URL || "http://localhost:3002",
  notifications:
    process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3003"
};

app.use(cors());
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/health", async (_req, res) => {
  const entries = await Promise.all(
    Object.entries(services).map(async ([name, url]) => {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 1500 });
        return [name, response.data];
      } catch (error) {
        return [name, { status: "down", message: error.message }];
      }
    })
  );

  res.json({
    service: "api-gateway",
    status: "ok",
    upstream: Object.fromEntries(entries)
  });
});

const proxyOptions = (target, stripPrefix) => ({
  target,
  changeOrigin: true,
  pathRewrite: {
    [`^/api/${stripPrefix}`]: `/${stripPrefix}`
  },
  onError(error, _req, res) {
    res.status(502).json({
      message: "Upstream service unavailable",
      detail: error.message
    });
  }
});

app.use("/api/users", createProxyMiddleware(proxyOptions(services.users, "users")));
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: services.users,
    changeOrigin: true,
    pathRewrite: { "^/api/auth": "/auth" }
  })
);
app.use(
  "/api/courses",
  createProxyMiddleware(proxyOptions(services.courses, "courses"))
);
app.use(
  "/api/enrollments",
  createProxyMiddleware({
    target: services.courses,
    changeOrigin: true,
    pathRewrite: { "^/api/enrollments": "/enrollments" }
  })
);
app.use(
  "/api/notifications",
  createProxyMiddleware(proxyOptions(services.notifications, "notifications"))
);

app.use((_req, res) => {
  res.status(404).json({ message: "Gateway route not found" });
});

app.listen(port, () => {
  console.log(`api-gateway listening on ${port}`);
});
