# Beta Access Codes - Single-Use System

## 🔐 How It Works

Each beta code can only be used **ONCE**. When someone signs up:
1. Code is validated against Firestore
2. If valid and unused → signup allowed
3. Code is immediately marked as USED
4. No one else can use that code

This prevents one person from sharing the code with 6,300 people in a Facebook group!

---

## 📋 Your Initial 10 Beta Codes

**COPY THESE AND ADD TO FIRESTORE:**

1. `VVVFRS`
2. `SVTQHH`
3. `EN88AQ`
4. `H8RXZ6`
5. `69JUVC`
6. `XJXHZM`
7. `2EHTS9`
8. `ZWNVSS`
9. `KFCHAK`
10. `8E685H`

---

## 🔧 How to Add Codes to Firestore

### **ONE-CLICK SETUP (EASIEST!):**

1. **Go to:** https://runplusplans.com/setup-beta-codes.html
2. **Click:** "Add All Codes to Firestore"
3. **Done!** All 10 codes added in seconds

That's it! No manual work needed.

---

## 📤 How to Share Codes with Beta Testers

**Via Facebook DM:**
```
Hey [Name]!

I'd love for you to beta test my new training app Run+ Plans.

Your exclusive beta access code: VVVFRS

Visit: https://runplusplans.com
This code can only be used once, so keep it to yourself!

Let me know what you think!
```

**Track who you gave each code to:**

Go to Firestore → betaCodes → [CODE] → Edit `createdFor` field:
- `VVVFRS` → "John Smith - ElliptiGO group"
- `SVTQHH` → "Sarah Jones - Running buddy"
- etc.

---

## ✅ Verification

After someone signs up, check Firestore:
- `used` should be `true`
- `usedBy` should show their email
- `usedAt` should show timestamp

If they try to share the code → second person gets "This code has already been used"

---

## 🔄 Need More Codes?

Run the generator again to create more:

```bash
node -e "
function generateCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const codes = new Set();
while (codes.size < 10) {
  codes.add(generateCode());
}

Array.from(codes).forEach((code, i) => {
  console.log((i+1) + '. ' + code);
});
"
```

Then add them to Firestore manually using the steps above.
