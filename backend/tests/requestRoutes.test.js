import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";

import requestRoutes from "../routes/requestRoutes.js";
import { errorHandler, notFound } from "../middleware/errorMiddleware.js";
import User from "../models/UserModel.js";
import Request from "../models/RequestModel.js";
import Item from "../models/ItemModel.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.NODE_ENV = "test";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/requests", requestRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
};

const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);

const SUPERADMIN_ID = "64b000000000000000000001";
const STAFF1_ID = "64b000000000000000000002";
const STAFF2_ID = "64b000000000000000000003";

const mockUsers = {
  [SUPERADMIN_ID]: { _id: SUPERADMIN_ID, name: "Super Admin", role: "superadmin" },
  [STAFF1_ID]: { _id: STAFF1_ID, name: "Staff One", role: "staff" },
  [STAFF2_ID]: { _id: STAFF2_ID, name: "Staff Two", role: "staff" },
};

const chainFindPending = () => ({
  sort: () => ({
    limit: () => ({
      select: () => ({
        lean: async () => [],
      }),
    }),
  }),
});

test("role protection: non-superadmin cannot approve", async () => {
  const app = buildApp();

  const originalUserFindById = User.findById;
  const originalRequestFindById = Request.findById;

  User.findById = (id) => ({
    select: async () => mockUsers[id] || null,
  });
  Request.findById = async () => null;

  const res = await request(app)
    .patch("/api/requests/abc123/approve")
    .set("Authorization", `Bearer ${tokenFor(STAFF1_ID)}`);

  assert.equal(res.status, 403);
  assert.match(res.body.message || "", /Superadmin only/i);

  User.findById = originalUserFindById;
  Request.findById = originalRequestFindById;
});

test("transition guard: superadmin cannot approve non-pending request", async () => {
  const app = buildApp();

  const originalUserFindById = User.findById;
  const originalRequestFindById = Request.findById;

  User.findById = (id) => ({
    select: async () => mockUsers[id] || null,
  });

  Request.findById = async () => ({
    _id: "req1",
    status: "Approved",
  });

  const res = await request(app)
    .patch("/api/requests/req1/approve")
    .set("Authorization", `Bearer ${tokenFor(SUPERADMIN_ID)}`);

  assert.equal(res.status, 409);
  assert.match(res.body.message || "", /Only pending requests can be approved/i);

  User.findById = originalUserFindById;
  Request.findById = originalRequestFindById;
});

test("staff can cancel own pending request", async () => {
  const app = buildApp();

  const originalUserFindById = User.findById;
  const originalRequestFindById = Request.findById;
  const originalCountDocuments = Request.countDocuments;
  const originalFind = Request.find;

  User.findById = (id) => ({
    select: async () => mockUsers[id] || null,
  });

  const reqDoc = {
    _id: "req2",
    userId: STAFF1_ID,
    status: "Pending",
    itemName: "Bond Paper",
    quantity: 3,
    save: async () => reqDoc,
  };
  Request.findById = async () => reqDoc;
  Request.countDocuments = async () => 0;
  Request.find = () => chainFindPending();

  const res = await request(app)
    .patch("/api/requests/req2/cancel")
    .set("Authorization", `Bearer ${tokenFor(STAFF1_ID)}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.request.status, "Canceled");

  User.findById = originalUserFindById;
  Request.findById = originalRequestFindById;
  Request.countDocuments = originalCountDocuments;
  Request.find = originalFind;
});

test("staff cannot cancel another user's pending request", async () => {
  const app = buildApp();

  const originalUserFindById = User.findById;
  const originalRequestFindById = Request.findById;

  User.findById = (id) => ({
    select: async () => mockUsers[id] || null,
  });

  const reqDoc = {
    _id: "req3",
    userId: STAFF2_ID,
    status: "Pending",
    itemName: "Marker",
    quantity: 2,
  };
  Request.findById = async () => reqDoc;

  const res = await request(app)
    .patch("/api/requests/req3/cancel")
    .set("Authorization", `Bearer ${tokenFor(STAFF1_ID)}`);

  assert.equal(res.status, 403);
  assert.match(res.body.message || "", /only cancel your own/i);

  User.findById = originalUserFindById;
  Request.findById = originalRequestFindById;
});

test("superadmin can reject pending request with reason", async () => {
  const app = buildApp();

  const originalUserFindById = User.findById;
  const originalRequestFindById = Request.findById;
  const originalCountDocuments = Request.countDocuments;
  const originalFind = Request.find;
  const originalItemFindById = Item.findById;

  User.findById = (id) => ({
    select: async () => mockUsers[id] || null,
  });

  const reqDoc = {
    _id: "req4",
    userId: STAFF1_ID,
    status: "Pending",
    itemName: "Printer Ink",
    quantity: 1,
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: "",
    save: async () => reqDoc,
  };

  Request.findById = async () => reqDoc;
  Request.countDocuments = async () => 0;
  Request.find = () => chainFindPending();
  Item.findById = async () => null;

  const res = await request(app)
    .patch("/api/requests/req4/reject")
    .set("Authorization", `Bearer ${tokenFor(SUPERADMIN_ID)}`)
    .send({ reason: "Need department head confirmation" });

  assert.equal(res.status, 200);
  assert.equal(res.body.request.status, "Rejected");
  assert.equal(res.body.request.rejectionReason, "Need department head confirmation");

  User.findById = originalUserFindById;
  Request.findById = originalRequestFindById;
  Request.countDocuments = originalCountDocuments;
  Request.find = originalFind;
  Item.findById = originalItemFindById;
});
