// utils/sendEmail.js
import nodemailer from "nodemailer";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

/**
 * Send an email using Gmail API OAuth2
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} [text] - Optional plain text version
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken?.token,
      },
    });

    const mailOptions = {
      from: `"COT Inventory System" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}:`, result.messageId);
    return result;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw error;
  }
}
