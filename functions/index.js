const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const Anthropic = require("@anthropic-ai/sdk");

initializeApp();

// Define secret for Anthropic API key
const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

/**
 * Send email notification when a new user signs up
 *
 * SETUP INSTRUCTIONS:
 * 1. Install dependencies: cd functions && npm install
 * 2. Configure email settings using Firebase environment config:
 *    firebase functions:config:set email.user="your-email@gmail.com" email.pass="your-app-password"
 *
 * For Gmail:
 * - Enable 2-factor authentication
 * - Generate an app password at: https://myaccount.google.com/apppasswords
 * - Use the app password (not your Gmail password)
 *
 * 3. Set your admin email to receive notifications:
 *    firebase functions:config:set email.admin="admin@example.com"
 *
 * 4. Deploy: firebase deploy --only functions
 */

exports.sendNewUserNotification = onDocumentCreated(
  "users/{userId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }

    const userData = snapshot.data();
    const userId = event.params.userId;

    // Only send email for new user sign-ups (not updates)
    if (!userData.createdAt) {
      console.log("Not a new user, skipping email");
      return;
    }

    console.log("New user signed up:", {
      userId,
      email: userData.email,
      displayName: userData.displayName,
    });

    // Get email configuration from environment variables
    // You can also hardcode these for testing, but use environment config for production
    const emailUser = process.env.EMAIL_USER; // Your email address
    const emailPass = process.env.EMAIL_PASS; // Your email app password
    const adminEmail = process.env.ADMIN_EMAIL; // Email to receive notifications

    // If email is not configured, just log and return
    if (!emailUser || !emailPass || !adminEmail) {
      console.log("⚠️ Email not configured. Set EMAIL_USER, EMAIL_PASS, and ADMIN_EMAIL environment variables.");
      console.log("To configure: firebase functions:config:set email.user='your-email' email.pass='your-password' email.admin='admin-email'");

      // Store notification in Firestore as backup
      await getFirestore().collection("adminNotifications").add({
        type: "new_user_signup",
        userId: userId,
        userEmail: userData.email,
        displayName: userData.displayName,
        approvalStatus: userData.approvalStatus,
        createdAt: userData.createdAt,
        notifiedAt: new Date(),
      });

      console.log("✅ Notification saved to Firestore (adminNotifications collection)");
      return;
    }

    // Create transporter for sending emails
    const transporter = nodemailer.createTransport({
      service: "gmail", // Change if using different email provider
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Email content
    const mailOptions = {
      from: `Run+ Plans <${emailUser}>`,
      to: adminEmail,
      subject: "🎉 New User Sign-Up - Run+ Plans",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00D4FF;">New User Signed Up!</h2>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${userData.displayName || "Not provided"}</p>
            <p><strong>Email:</strong> ${userData.email}</p>
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>Approval Status:</strong> ${userData.approvalStatus || "pending"}</p>
            <p><strong>Signed up:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚠️ Action Required:</strong></p>
            <p style="margin: 5px 0 0 0;">Review and approve this user in your Firebase Console or admin panel.</p>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <a href="https://console.firebase.google.com/project/run-plus-plans/firestore/databases/-default-/data/~2Fusers~2F${userId}"
               style="color: #00D4FF; text-decoration: none;">
              View in Firebase Console →
            </a>
          </p>
        </div>
      `,
    };

    try {
      // Send email
      await transporter.sendMail(mailOptions);
      console.log("✅ Email notification sent successfully to:", adminEmail);

      // Also store in Firestore for record keeping
      await getFirestore().collection("adminNotifications").add({
        type: "new_user_signup",
        userId: userId,
        userEmail: userData.email,
        displayName: userData.displayName,
        approvalStatus: userData.approvalStatus,
        createdAt: userData.createdAt,
        notifiedAt: new Date(),
        emailSent: true,
      });

      return null;
    } catch (error) {
      console.error("❌ Error sending email:", error);

      // Store failed notification in Firestore
      await getFirestore().collection("adminNotifications").add({
        type: "new_user_signup",
        userId: userId,
        userEmail: userData.email,
        displayName: userData.displayName,
        approvalStatus: userData.approvalStatus,
        createdAt: userData.createdAt,
        notifiedAt: new Date(),
        emailSent: false,
        error: error.message,
      });

      throw error;
    }
  }
);

/**
 * Proxy function for Anthropic Claude API calls
 * Keeps API key secure on server-side
 */
exports.callAnthropicAPI = onCall(
  {
    cors: true,
    enforceAppCheck: false, // Set to true in production if you enable App Check
    secrets: [anthropicApiKey], // Reference the secret
    runtime: 'nodejs20', // Use Node.js 20 runtime
  },
  async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
      throw new Error("Unauthorized: User must be authenticated");
    }

    const { model, max_tokens, system, messages } = request.data;

    // Validate required parameters
    if (!model || !messages) {
      throw new Error("Missing required parameters: model and messages are required");
    }

    // Get API key from secret
    const apiKey = anthropicApiKey.value();

    if (!apiKey) {
      throw new Error("Anthropic API key not configured. Set the secret: firebase functions:secrets:set ANTHROPIC_API_KEY");
    }

    // Initialize Anthropic client
    const client = new Anthropic({
      apiKey: apiKey,
    });

    try {
      // Make API call
      const response = await client.messages.create({
        model: model || "claude-sonnet-4-5-20250929",
        max_tokens: max_tokens || 8000,
        system: system,
        messages: messages,
      });

      return {
        success: true,
        content: response.content,
        usage: response.usage,
      };
    } catch (error) {
      console.error("Anthropic API Error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
);
