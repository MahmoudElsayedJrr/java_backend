const nodemailer = require("nodemailer");
const logger = require("../config/logger");

// ── Transporter ───────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 4000,
  greetingTimeout: 4000,
  socketTimeout: 4000,
});

// ── Send verification code email ──────────────────────────────
const sendVerificationEmail = async (toEmail, name, code) => {
  try {
    await transporter.sendMail({
      from: `"Lungo Cafe" <${process.env.SMTP_FROM}>`,
      to: toEmail,
      subject: "تأكيد البريد الإلكتروني — Lungo Cafe",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2C1810; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #FF8F00; margin: 0;">☕ Lungo Cafe</h1>
          </div>
          <div style="background: #FFF8E7; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #2C1810;">مرحباً ${name}!</h2>
            <p style="color: #555; font-size: 16px;">شكراً لتسجيلك في Lungo Cafe. استخدم الكود التالي لتأكيد بريدك الإلكتروني:</p>
            <div style="background: #2C1810; color: #FF8F00; font-size: 36px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #888; font-size: 14px;">الكود صالح لمدة <strong>دقيقتين</strong> فقط.</p>
            <p style="color: #888; font-size: 14px;">إذا لم تقم بالتسجيل، تجاهل هذه الرسالة.</p>
          </div>
        </div>
      `,
    });
    logger.info(`[Email] Verification code sent to ${toEmail}`);
  } catch (err) {
    logger.error(`[Email] Failed to send verification email`, {
      error: err.message,
    });
    throw new Error(`Failed to send verification email: ${err.message}`);
  }
};

// ── Send password reset email ─────────────────────────────────
const sendPasswordResetEmail = async (toEmail, name, code) => {
  try {
    await transporter.sendMail({
      from: `"Lungo Cafe" <${process.env.SMTP_FROM}>`,
      to: toEmail,
      subject: "إعادة تعيين كلمة المرور — Lungo Cafe",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2C1810; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #FF8F00; margin: 0;">☕ Lungo Cafe</h1>
          </div>
          <div style="background: #FFF8E7; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #2C1810;">مرحباً ${name}!</h2>
            <p style="color: #555; font-size: 16px;">تلقينا طلباً لإعادة تعيين كلمة المرور. استخدم الكود التالي:</p>
            <div style="background: #2C1810; color: #FF8F00; font-size: 36px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #888; font-size: 14px;">الكود صالح لمدة <strong>10 دقائق</strong> فقط.</p>
            <p style="color: #888; font-size: 14px;">إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة.</p>
          </div>
        </div>
      `,
    });
    logger.info(`[Email] Password reset code sent to ${toEmail}`);
  } catch (err) {
    logger.error(`[Email] Failed to send password reset email`, {
      error: err.message,
    });
    throw new Error("Failed to send password reset email");
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
