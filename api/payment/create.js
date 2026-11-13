import admin from "firebase-admin";

/* =====================================
   api/payment/create.js
   Creates a Payo order for 20 ETB = 10 questions
===================================== */

const PAYO_ORDERS_URL =
  process.env.PAYO_ORDERS_URL || "https://api.pygate.et/v1/orders";

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
        error: "PAYO_API_KEY is missing in Vercel."
      });
    }

    const firebase = getFirebase();

    /* VERIFY FIREBASE USER */

    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!token) {
      return res.status(401).json({
        error: "Please sign in first."
      });
    }

    const decoded = await firebase.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const db = firebase.database();

    /* DYNAMIC CALLBACK URL FROM REQUEST HOST */

    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const appUrl = `${proto}://${host}`;

    const callbackUrl = `${appUrl.replace(/\/+$/, "")}/api/payment/callback`;

    /* CREATE PAYO ORDER */

    const orderResponse = await fetch(
      PAYO_ORDERS_URL,
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: 20,
          description: "Jemal Muslim AI - 10 Questions",
          expiresInSeconds: 600,
          items: [
            {
              name: "10 AI Questions",
              qty: 1,
              price: 20
            }
          ],
          metadata: {
            userId: uid,
            credits: 10
          },
          callbackUrl
        })
      }
    );

    const rawResult = await orderResponse.text();

    let result;

    try {
      result = JSON.parse(rawResult);
    } catch {
      console.error("Payo non-JSON response:", rawResult);

      return res.status(502).json({
        error: "Payo returned an unexpected response."
      });
    }

    if (!orderResponse.ok) {
      console.error("Payo order error:", result);

      return res.status(502).json({
        error:
          result.message ||
          result.error ||
          "Payo could not create the payment order."
      });
    }

    const orderId =
      result.orderId ||
      result.data?.orderId;

    const paymentUrl =
      result.paymentUrl ||
      result.data?.paymentUrl;

    if (!orderId || !paymentUrl) {
      console.error("Unexpected Payo response:", result);

      return res.status(502).json({
        error: "Payo did not return the payment link."
      });
    }

    let validPaymentUrl;

    try {
      validPaymentUrl = new URL(paymentUrl);

      if (validPaymentUrl.protocol !== "https:") {
        throw new Error("Invalid payment URL protocol.");
      }
    } catch {
      console.error("Invalid Payo payment URL:", paymentUrl);

      return res.status(502).json({
        error: "Payo returned an invalid payment link."
      });
    }

    await db.ref(`paymentOrders/${orderId}`).set({
      provider: "payo",
      userId: uid,
      amount: 20,
      currency: "ETB",
      credits: 10,
      status: "PENDING",
      createdAt: Date.now()
    });

    return res.status(200).json({
      success: true,
      orderId,
      paymentUrl: validPaymentUrl.toString()
    });

  } catch (error) {
    console.error("Payment creation error:", error, error.cause);

    const cause = error.cause
      ? ` [${error.cause.code || error.cause.message}]`
      : "";

    return res.status(500).json({
      error:
        (error.message || "Payment creation failed.") + cause
    });
  }
}
