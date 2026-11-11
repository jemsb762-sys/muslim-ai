
import admin from "firebase-admin";
import crypto from "crypto";

export const config = {
  api: { bodyParser: false }
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

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function verifySignature(body, signature, apiKey) {
  if (typeof signature !== "string") return false;

  const expected = "sha256=" +
    crypto.createHmac("sha256", apiKey)
      .update(body)
      .digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  return a.length === b.length &&
    crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.PAYO_API_KEY;
    if (!apiKey) throw new Error("PAYO_API_KEY is missing");

    const body = await readBody(req);
    const signature = req.headers["x-pygate-signature"];

    if (!verifySignature(body, signature, apiKey)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(body.toString("utf8"));
    const orderId = event.orderId;
    const status = String(event.status || "").toUpperCase();

    if (!orderId || !status) {
      return res.status(400).json({ error: "Invalid callback" });
    }

    const firebase = getFirebase();
    const db = firebase.database();
    const orderRef = db.ref(`paymentOrders/${orderId}`);
    const snapshot = await orderRef.get();

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = snapshot.val();

    if (order.provider !== "payo") {
      return res.status(400).json({ error: "Invalid provider" });
    }

    if (Number(event.amount) !== Number(order.amount) ||
        Number(order.amount) !== 20) {
      return res.status(400).json({ error: "Amount mismatch" });
    }

    if (event.metadata?.userId &&
        event.metadata.userId !== order.userId) {
      return res.status(400).json({ error: "User mismatch" });
    }

    if (status === "REJECTED") {
      await orderRef.update({
        status: "REJECTED",
        updatedAt: Date.now()
      });
      return res.status(200).json({ received: true });
    }

    if (status !== "APPROVED") {
      return res.status(200).json({ received: true });
    }

    if (order.status === "APPROVED") {
      return res.status(200).json({
        received: true,
        alreadyProcessed: true
      });
    }

    const uid = order.userId;
    if (!uid) throw new Error("Order user is missing");

    const userRef = db.ref(`users/${uid}`);

    const transaction = await userRef.transaction((user) => {
      user = user || {};
      user.paidCredits = Number(user.paidCredits) || 0;
      user.payoAppliedOrders = user.payoAppliedOrders || {};

      if (user.payoAppliedOrders[orderId]) return user;

      user.paidCredits += 10;
      user.payoAppliedOrders[orderId] = true;
      return user;
    });

    if (!transaction.committed) {
      throw new Error("Could not add credits");
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
      error: "Callback processing failed"
    });
  }
}
