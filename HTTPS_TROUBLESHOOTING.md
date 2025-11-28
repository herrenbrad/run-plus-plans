# HTTPS Troubleshooting for app.runplusplans.com

## 🚨 Current Issue

GitHub Pages shows: "Enforce HTTPS — Unavailable for your site because your domain is not properly configured to support HTTPS"

**This is NORMAL during setup!** HTTPS will be enabled automatically once DNS is properly configured and propagated.

---

## ✅ Step-by-Step Fix

### Step 1: Verify DNS CNAME Record is Set Up

**In GoDaddy:**
1. Go to DNS management for `runplusplans.com`
2. Look for a CNAME record with:
   - **Name:** `app`
   - **Value:** `herrenbrad.github.io`

**If the record doesn't exist or is wrong:**
- Add/edit the CNAME record as described in the DNS setup guide
- Make sure the value is exactly: `herrenbrad.github.io` (no trailing slash, no path)

### Step 2: Check DNS Propagation

Visit: https://dnschecker.org/#CNAME/app.runplusplans.com

**What to look for:**
- ✅ Green checkmarks across multiple locations = DNS is propagating
- ❌ Red X's everywhere = DNS not set up or not propagated yet

**If you see red X's:**
- Double-check the CNAME record in GoDaddy
- Make sure you saved the record
- Wait 5-10 minutes and check again

### Step 3: Verify GitHub Pages Can See Your Domain

1. Go to: https://github.com/herrenbrad/run-plus-plans/settings/pages
2. Under "Custom domain", you should see: `app.runplusplans.com`
3. Look for one of these statuses:

**Status A: "DNS check in progress" (Yellow warning)**
- ✅ This is GOOD - DNS is propagating
- Wait 10-30 minutes
- Refresh the page
- Status should change to green checkmark

**Status B: "DNS check failed" (Red error)**
- ❌ DNS not set up correctly
- Go back to Step 1 and verify CNAME record

**Status C: Green checkmark ✅**
- ✅ DNS is configured correctly!
- HTTPS should be available now
- Try checking "Enforce HTTPS" again

### Step 4: Wait for SSL Certificate Provisioning

Even after DNS propagates, GitHub needs to:
1. Detect the DNS record
2. Provision an SSL certificate
3. Enable HTTPS

**Timeline:**
- DNS propagation: 5-15 minutes
- SSL certificate provisioning: 5-30 minutes after DNS propagates
- Total: Usually 15-45 minutes from when you set up DNS

### Step 5: Enable HTTPS (After DNS is Ready)

Once you see a green checkmark in GitHub Pages settings:

1. Go to: https://github.com/herrenbrad/run-plus-plans/settings/pages
2. Check the box: **"Enforce HTTPS"**
3. Click **Save**

**If it still says "Unavailable":**
- Wait another 10-15 minutes
- GitHub may still be provisioning the SSL certificate
- Try again later

---

## 🔍 Quick Diagnostic Checklist

Run through these checks:

- [ ] CNAME record exists in GoDaddy with Name: `app`, Value: `herrenbrad.github.io`
- [ ] DNS checker shows green checkmarks: https://dnschecker.org/#CNAME/app.runplusplans.com
- [ ] Custom domain is set in GitHub Pages settings: `app.runplusplans.com`
- [ ] Waited at least 15-30 minutes after setting up DNS
- [ ] Refreshed GitHub Pages settings page

---

## 🚨 Common Issues

### Issue: "DNS check failed" in GitHub

**Possible causes:**
1. CNAME record not set up in GoDaddy
2. Wrong value in CNAME record (should be `herrenbrad.github.io`)
3. DNS hasn't propagated yet (wait longer)

**Fix:**
- Verify CNAME record in GoDaddy
- Make sure value is exactly `herrenbrad.github.io`
- Wait 15-30 minutes and check again

### Issue: DNS propagated but HTTPS still unavailable

**Possible causes:**
1. GitHub is still provisioning SSL certificate (wait 15-30 more minutes)
2. Custom domain not saved in GitHub Pages settings

**Fix:**
- Make sure custom domain is saved in GitHub Pages settings
- Wait 15-30 minutes
- Try refreshing the settings page
- Try unchecking and rechecking "Enforce HTTPS"

### Issue: Site loads but shows "Not Secure"

**Possible causes:**
1. HTTPS not enforced in GitHub Pages settings
2. SSL certificate still provisioning

**Fix:**
- Go to GitHub Pages settings
- Check "Enforce HTTPS" (if available)
- Wait for SSL certificate to finish provisioning

---

## 📋 Expected Timeline

```
T+0 min:   Set up CNAME in GoDaddy
T+5-15 min: DNS propagates (check dnschecker.org)
T+15-30 min: GitHub detects DNS, starts SSL provisioning
T+30-45 min: HTTPS becomes available, can enable "Enforce HTTPS"
```

**Total time: Usually 30-45 minutes from DNS setup**

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ DNS checker shows green checkmarks
2. ✅ GitHub Pages shows green checkmark next to custom domain
3. ✅ "Enforce HTTPS" checkbox is available (not grayed out)
4. ✅ Site loads at `https://app.runplusplans.com` (not `http://`)
5. ✅ Browser shows green lock icon

---

## 🆘 Still Not Working?

If after 1 hour you still see issues:

1. **Double-check CNAME record:**
   - GoDaddy → DNS → Verify `app` → `herrenbrad.github.io`

2. **Verify GitHub Pages settings:**
   - Custom domain: `app.runplusplans.com` (saved)
   - Source: `gh-pages` branch

3. **Check DNS propagation:**
   - https://dnschecker.org/#CNAME/app.runplusplans.com
   - Should show green checkmarks globally

4. **Try removing and re-adding custom domain:**
   - In GitHub Pages settings, remove custom domain
   - Wait 5 minutes
   - Add it back: `app.runplusplans.com`
   - Save and wait

5. **Contact support:**
   - If DNS is correct and propagated but HTTPS still unavailable after 1 hour
   - GitHub Pages support: https://support.github.com

---

**Most likely issue:** DNS just needs more time to propagate. Wait 15-30 minutes and check again!



