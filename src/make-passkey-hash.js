import crypto from "crypto";

const passkey = "khel";
const hash = crypto.createHash("sha256").update(passkey).digest("hex");

console.log("Hashed Passkey:", hash);