# DNS Setup Guide for app.runplusplans.com

## 🎯 What You Need to Do

Set up a **CNAME record** in your domain registrar to point `app.runplusplans.com` to your GitHub Pages site.

---

## 📋 Step-by-Step Instructions

### Step 1: Log into Your Domain Registrar

Go to your domain registrar (e.g., Namecheap, GoDaddy, Google Domains, Cloudflare) and find the DNS management section.

### Step 2: Add CNAME Record

**Exact values to enter:**

```
Type: CNAME
Name/Host: app
Value/Target: herrenbrad.github.io
TTL: 3600 (or Automatic/Default)
```

**Important Notes:**
- **Name/Host**: Just `app` (not `app.runplusplans.com`)
- **Value/Target**: `herrenbrad.github.io` (your GitHub username + `.github.io`)
- **Do NOT include** `/run-plus-plans` in the value - GitHub Pages handles the path automatically

### Step 3: Save and Wait

1. Click **Save** or **Add Record**
2. DNS propagation can take **5-15 minutes** (sometimes up to 24 hours)
3. You can check status at: https://dnschecker.org/#CNAME/app.runplusplans.com

---

## 🔍 How to Find DNS Settings (Common Registrars)

### Namecheap
1. Log in → **Domain List** → Click **Manage** next to `runplusplans.com`
2. Go to **Advanced DNS** tab
3. Click **Add New Record**
4. Select **CNAME Record**
5. Enter values above

### GoDaddy
1. Log in → **My Products** → Click **DNS** next to `runplusplans.com`
2. Scroll to **Records** section
3. Click **Add** → Select **CNAME**
4. Enter values above

### Google Domains
1. Log in → Click on `runplusplans.com`
2. Go to **DNS** tab
3. Scroll to **Custom resource records**
4. Click **Add record** → Select **CNAME**
5. Enter values above

### Cloudflare
1. Log in → Select `runplusplans.com`
2. Go to **DNS** → **Records**
3. Click **Add record**
4. Type: **CNAME**
5. Name: `app`
6. Target: `herrenbrad.github.io`
7. Proxy status: **DNS only** (gray cloud) - Important!
8. Click **Save**

---

## ✅ Verification Steps

### 1. Check DNS Propagation
Visit: https://dnschecker.org/#CNAME/app.runplusplans.com

You should see green checkmarks across multiple locations when DNS has propagated.

### 2. Verify in GitHub Pages Settings
1. Go to: https://github.com/herrenbrad/run-plus-plans/settings/pages
2. Under "Custom domain", enter: `app.runplusplans.com`
3. Check **Enforce HTTPS**
4. Click **Save**

**Expected behavior:**
- Initially: May show warning "DNS check in progress" (this is normal)
- After DNS propagates: Warning disappears, shows green checkmark ✅
- HTTPS will be enabled automatically

### 3. Test the Site
Once DNS propagates:
- Visit: `https://app.runplusplans.com`
- Should load your training app
- Should show green lock icon (HTTPS enabled)

---

## 🚨 Common Issues & Solutions

### Issue: "DNS check in progress" warning persists
**Solution:**
- Wait longer (can take up to 24 hours)
- Verify CNAME record is correct in your registrar
- Make sure you're using `herrenbrad.github.io` (not the full repo path)

### Issue: Site still shows "can't be reached"
**Solution:**
- Check DNS propagation: https://dnschecker.org/#CNAME/app.runplusplans.com
- Verify CNAME record is saved in your registrar
- Make sure you entered `app` as the name (not `app.runplusplans.com`)

### Issue: HTTPS not working
**Solution:**
- Wait for DNS to fully propagate
- In GitHub Pages settings, make sure "Enforce HTTPS" is checked
- GitHub will automatically provision SSL certificate (can take a few minutes)

### Issue: Wrong site loads
**Solution:**
- Verify CNAME value is exactly: `herrenbrad.github.io`
- Make sure you configured custom domain in GitHub Pages settings
- Clear browser cache and try again

---

## 📝 Quick Reference

**CNAME Record:**
```
Name: app
Type: CNAME
Value: herrenbrad.github.io
TTL: 3600
```

**GitHub Pages Settings:**
- Custom domain: `app.runplusplans.com`
- Enforce HTTPS: ✅ Checked

**Test URLs:**
- DNS Check: https://dnschecker.org/#CNAME/app.runplusplans.com
- GitHub Pages: https://herrenbrad.github.io/run-plus-plans (temporary, works now)
- Production: https://app.runplusplans.com (after DNS propagates)

---

## 🎯 What Happens After DNS is Set Up

1. **DNS propagates** (5-15 minutes typically)
2. **GitHub Pages detects** the CNAME record
3. **SSL certificate** is automatically provisioned
4. **HTTPS is enabled** automatically
5. **Site is live** at `app.runplusplans.com`

The site will automatically redirect from the GitHub Pages URL to your custom domain once everything is configured!

---

**Need help?** Let me know which registrar you're using and I can provide more specific instructions!



