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
  async sendPasswordResetOtp(email, otp) {
    const mailOptions = {
      from: `"SKR System" <${config.mail.from}>`,
      to: email,
      subject: "Password Reset OTP - SKR System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #1a1a1a; text-align: center; margin-bottom: 24px;">Reset Your Password</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your password reset code is:
          </p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
          </div>
          <p style="color: #888; font-size: 13px; text-align: center;">
            This code expires in 15 minutes. Do not share it with anyone.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  },

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

  async sendWelcomeEmail(email, fullName, password) {
    const displayName = fullName || email.split("@")[0];
    const mailOptions = {
      from: `"SKR System" <${config.mail.from}>`,
      to: email,
      subject: "Chào mừng bạn đến với SKR!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e0e0e0; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #10b981; font-size: 28px; margin-bottom: 8px;">Chào mừng đến với SKR!</h1>
            <p style="color: #666; font-size: 16px;">Tài khoản của bạn đã được tạo thành công</p>
          </div>
          <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
              Xin chào <strong>${displayName}</strong>!
            </p>
            <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 12px;">
              Cảm ơn bạn đã tham gia SKR. Dưới đây là thông tin tài khoản của bạn:
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 14px;">Email:</td>
                <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: bold;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 14px;">Mật khẩu:</td>
                <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: bold;">${password}</td>
              </tr>
            </table>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${config.app.clientUrl || "http://localhost:5173"}/login"
               style="display: inline-block; background: linear-gradient(135deg, #10b981, #06b6d4); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: bold; font-size: 15px;">
              Đăng nhập ngay
            </a>
          </div>
          <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Đây là email tự động từ hệ thống SKR. Vui lòng không trả lời email này.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  },
};

module.exports = emailService;
