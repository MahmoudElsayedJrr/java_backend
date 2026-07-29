const logger = require("../config/logger");

// ── Send verification code email ──────────────────────────────
const sendVerificationEmail = async (toEmail, name, code) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error("BREVO_API_KEY is not defined in environment variables");
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: "Lungo Cafe",
          email: process.env.SMTP_FROM,
        },
        to: [
          {
            email: toEmail,
            name: name,
          },
        ],
        subject: "تأكيد البريد الإلكتروني — Lungo Cafe",
        htmlContent: `
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
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

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
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error("BREVO_API_KEY is not defined in environment variables");
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: "Lungo Cafe",
          email: process.env.SMTP_FROM,
        },
        to: [
          {
            email: toEmail,
            name: name,
          },
        ],
        subject: "إعادة تعيين كلمة المرور — Lungo Cafe",
        htmlContent: `
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
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    logger.info(`[Email] Password reset code sent to ${toEmail}`);
  } catch (err) {
    logger.error(`[Email] Failed to send password reset email`, {
      error: err.message,
    });
    throw new Error(`Failed to send password reset email: ${err.message}`);
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
