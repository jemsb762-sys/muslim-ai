


import admin from "firebase-admin";
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false
  }
};

function getFirebase() {
  if (admin.apps.length) return admin;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!raw || !databaseURL) {
    throw new Error("Firebase configuration is missing.");
  }

  const serviceAccount = JSON.parse(raw);
  serviceAccount.private_key =
    serviceAccount.private_key?.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL
  });

  return admin;
}

async function getRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks);
}

function verifySignature(rawBody, signature, apiKey) {
  if (!signature || !apiKey) return false;

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", apiKey)
      .update(rawBody)
      .digest("hex");

  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  try {
    const apiKey = process.env.PAYO_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "PAYO_API_KEY is missing."
      });
    }

    const rawBody = await getRawBody(req);

    const signature =
      req.headers["x-pygate-signature"];

    if (!verifySignature(rawBody, signature, apiKey)) {
      return res.status(401).json({
        error: "Invalid payment signature."
      });
    }

    const event = JSON.parse(rawBody.toString("utf8"));

    const orderId = event.orderId;
    const status = String(event.status || "").toUpperCase();

    if (!orderId || !status) {
      return res.status(400).json({
        error: "Invalid callback data."
      });
    }

    const firebase = getFirebase();
    const db = firebase.database();

    const orderRef = db.ref(`paymentOrders/${orderId}`);
    const orderSnapshot = await orderRef.get();

    if (!orderSnapshot.exists()) {
      return res.status(404).json({
        error: "Payment order not found."
      });
    }

    const order = orderSnapshot.val();

    if (order.provider !== "payo") {
      return res.status(400).json({
        error: "Invalid payment provider."
      });
    }

    if (
      Number(event.amount) !== Number(order.amount) ||
      Number(order.amount) !== 20
    ) {
      return res.status(400).json({
        error: "Payment amount mismatch."
      });
    }

    if (
      event.metadata?.userId &&
      event.metadata.userId !== order.userId
    ) {
      return res.status(400).json({
        error: "Payment user mismatch."
      });
    }

    if (status === "REJECTED") {
      await orderRef.update({
        status: "REJECTED",
        updatedAt: Date.now()
      });

      return res.status(200).json({
        received: true,
        status: "REJECTED"
      });
    }

    if (status !== "APPROVED") {
      return res.status(200).json({
        received: true,
        status: "PENDING"
      });
    }

    if (order.status === "APPROVED") {
      return res.status(200).json({
        received: true,
        alreadyProcessed: true
      });
    }

    const uid = order.userId;

    if (!uid) {
      return res.status(400).json({
        error: "Payment user is missing."
      });
    }

    const userRef = db.ref(`users/${uid}`);

    const result = await userRef.transaction((user) => {
      user = user || {};

      user.paidCredits =
        Number(user.paidCredits) || 0;

      user.payoAppliedOrders =
        user.payoAppliedOrders || {};

      if (user.payoAppliedOrders[orderId]) {
        return user;
      }

      user.paidCredits += 10;
      user.payoAppliedOrders[orderId] = true;

      return user;
    });

    if (!result.committed) {
      throw new Error("Could not apply payment credits.");
    }

    await orderRef.update({
      status: "APPROVED",
      creditsAdded: 10,
      transactionRef:
        event.extractedData?.transactionRef || null,
      approvedAt: Date.now()
    });

    return res.status(200).json({
      received: true,
      status: "APPROVED",
      creditsAdded: 10
    });

  } catch (error) {
    console.error("Payo callback error:", error);

    return res.status(500).json({
      error: "Payment callback processing failed."
    });
  }
}