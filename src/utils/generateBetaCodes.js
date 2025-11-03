/**
 * SIMPLE Beta Code Generator
 *
 * This generates 10 unique 6-character codes.
 * You can run this in your browser console or as a Node script.
 */

/**
 * Generate a random 6-character code
 * Uses uppercase letters and numbers, avoiding ambiguous characters (0, O, I, 1, L)
 */
function generateCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No 0, O, I, 1, L for clarity
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate 10 unique codes
 */
function generateBetaCodes() {
  const codes = new Set();

  while (codes.size < 10) {
    codes.add(generateCode());
  }

  return Array.from(codes);
}

// Generate and log codes
console.log('🎫 Generated 10 Beta Access Codes:');
console.log('===================================');
const codes = generateBetaCodes();
codes.forEach((code, index) => {
  console.log(`${index + 1}. ${code}`);
});
console.log('===================================\n');

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateCode, generateBetaCodes };
}

export { generateCode, generateBetaCodes };
