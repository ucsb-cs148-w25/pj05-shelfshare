import * as admin from "firebase-admin";
import * as fs from "fs";

// Load Firebase service account credentials
const serviceAccountPath = "./serviceAccountKey.json";

if (!fs.existsSync(serviceAccountPath)) {
    console.error("Service account key file not found!");
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function deleteUser(uid: string): Promise<void> {
    try {
        await db.collection("profile").doc(uid).delete();
        console.log(`User ${uid} deleted successfully`);
    } catch (error) {
        console.error("Error deleting user:", error);
    }
}


