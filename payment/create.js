import admin from "firebase-admin";

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
        error: "PAYO_API_KEY is missing."
      });
    }

    const firebase = getFirebase();

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

    const callbackUrl =
      "https://muslim-ai-wzd1.vercel.app/api/payment/callback";

    const orderResponse = await fetch(
      "https://checkout.payment.et/api/v1/orders",
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

    const result = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("Payo order error:", result);
      return res.status(502).json({
        error: "Payo could not create the payment order.",
        details: result
      });
    }

    const orderId =
      result.orderId || result.data?.orderId;

    const paymentUrl =
      result.paymentUrl || result.data?.paymentUrl;

    if (!orderId || !paymentUrl) {
      console.error("Unexpected Payo response:", result);
      return res.status(502).json({
        error: "Payo did not return the payment link."
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
      orderId,
      paymentUrl
    });

  } catch (error) {
    console.error("Payment creation error:", error);

    return res.status(500).json({
      error: error.message || "Payment creation failed."
    });
