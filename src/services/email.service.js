const nodemailer = require("nodemailer");
const config = require("../config");

const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: config.mail.port === 465,
  auth: {
    user: config.mail.user,
    pass: config.mail.pass,
  },
});

const emailService = {
  async sendVerificationOtp(email, otp) {
    const mailOptions = {
      from: `"SKR System" <${config.mail.from}>`,
      to: email,
      subject: "Email Verification - SKR System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #1a1a1a; text-align: center; margin-bottom: 24px;">Verify Your Email</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your verification code is:
          </p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
          </div>
          <p style="color: #888; font-size: 13px; text-align: center;">
            This code expires in ${config.otp.expiresInMinutes} minutes. Do not share it with anyone.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  },
};

module.exports = emailService;
