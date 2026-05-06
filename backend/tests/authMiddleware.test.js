import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";

import { auth } from "../middleware/authMiddleware.js";
import { errorHandler, notFound } from "../middleware/errorMiddleware.js";
import User from "../models/UserModel.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.NODE_ENV = "test";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.get("/api/protected", auth, (req, res) => {
    res.json({ userId: req.user._id, role: req.user.role });
  });
  app.use(notFound);
  app.use(errorHandler);
  return app;
};

const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);

test("auth middleware blocks archived users", async () => {
  const app = buildApp();

  const originalUserFindById = User.findById;
  User.findById = () => ({
    select: async () => ({
      _id: "64b000000000000000000010",
      role: "staff",
      isArchived: true,
    }),
  });

  const res = await request(app)
    .get("/api/protected")
    .set("Authorization", `Bearer ${tokenFor("64b000000000000000000010")}`);

  assert.equal(res.status, 403);
  assert.match(res.body.message || "", /archived/i);

  User.findById = originalUserFindById;
});

test("auth middleware allows active users", async () => {
  const app = buildApp();

  const originalUserFindById = User.findById;
  User.findById = () => ({
    select: async () => ({
      _id: "64b000000000000000000011",
      role: "staff",
      isArchived: false,
    }),
  });

  const res = await request(app)
    .get("/api/protected")
    .set("Authorization", `Bearer ${tokenFor("64b000000000000000000011")}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.userId, "64b000000000000000000011");

  User.findById = originalUserFindById;
});