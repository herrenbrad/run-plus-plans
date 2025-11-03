/**
 * Generate unique beta access codes and add them to Firestore
 *
 * Usage: node generateBetaCodes.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to get your service account key)
// For now, this is a template - you'll need to add your Firebase credentials
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Generate a random 6-character code
 * Uses uppercase letters and numbers, avoiding ambiguous characters (0, O, I, 1)
 */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if code already exists in Firestore
 */
async function codeExists(code) {
  const docRef = db.collection('betaCodes').doc(code);
  const doc = await docRef.get();
  return doc.exists;
}

/**
 * Generate specified number of unique codes
 */
async function generateUniqueCodes(count) {
  const codes = [];

  while (codes.length < count) {
    const code = generateCode();

    // Check if we already generated this code in this batch
    if (codes.includes(code)) {
      continue;
    }

    // Check if code exists in Firestore
    const exists = await codeExists(code);
    if (!exists) {
      codes.push(code);
    }
  }

  return codes;
}

/**
 * Add codes to Firestore
 */
async function addCodesToFirestore(codes) {
  const batch = db.batch();

  codes.forEach(code => {
    const docRef = db.collection('betaCodes').doc(code);
    batch.set(docRef, {
      code: code,
      used: false,
      usedBy: null,
      usedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdFor: '', // You can manually update this in Firebase Console
      notes: ''
    });
  });

  await batch.commit();
}

/**
 * Main function
 */
async function main() {
  const numberOfCodes = 10;

  console.log(`🎫 Generating ${numberOfCodes} unique beta codes...`);

  const codes = await generateUniqueCodes(numberOfCodes);

  console.log('\n✅ Generated codes:');
  console.log('==================');
  codes.forEach((code, index) => {
    console.log(`${index + 1}. ${code}`);
  });
  console.log('==================\n');

  console.log('💾 Adding codes to Firestore...');
  await addCodesToFirestore(codes);

  console.log('✅ Done! Codes added to Firestore.');
  console.log('\n📋 Next steps:');
  console.log('1. Go to Firebase Console → Firestore');
  console.log('2. Find the "betaCodes" collection');
  console.log('3. Update "createdFor" field with recipient names');
  console.log('4. Copy codes to send via Facebook DM\n');

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
