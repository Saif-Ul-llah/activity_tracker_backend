import * as admin from "firebase-admin";

let serviceAccount: admin.ServiceAccount | undefined;

try {
  serviceAccount = require("./service_account_key.json") as admin.ServiceAccount;
} catch {
  serviceAccount = undefined;
}

if (!admin.apps.length) {
  admin.initializeApp(
    serviceAccount
      ? { credential: admin.credential.cert(serviceAccount) }
      : undefined
  );
}

export const authService = admin.auth();
export const messaging = admin.messaging();
