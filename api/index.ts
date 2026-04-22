import express from "express";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
