const nodemailer = require('nodemailer');
const config = require('../../config');

let transporter;

// 이메일 설정이 있는 경우에만 초기화
if (config.email) {
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465 ? true : false, // gmail 587 → false
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  // 연결 테스트 (서버는 죽지 않음)
  transporter.verify((error, success) => {
    if (error) {
      console.warn('[Email] Nodemailer verification failed:', error.message);
    } else {
      console.log(`[Email] Transport is ready (using ${config.email.host}).`);
    }
  });

} else {
  console.warn('[Email] Email config missing in .env. Email features disabled.');
}

// 공통 sendEmail
const sendEmail = async (to, subject, text, html) => {
  if (!transporter) {
    console.error('[Email] Attempted to send email but service is not configured.');
    throw new Error('Email service is not configured on this server.');
  }

  try {
    await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html,
    });

    console.log(`[Email] Sent to: ${to} | Subject: ${subject}`);
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    throw error;
  }
};

// 비밀번호 재설정 이메일
const sendPasswordResetEmail = async (to, token) => {
  const resetUrl = `${config.appUrl}/reset-password?token=${token}`;

  await sendEmail(
    to,
    'Prompthub 비밀번호 재설정 요청',
    `비밀번호를 재설정하려면 다음 링크를 클릭하세요: ${resetUrl}`,
    `<p>비밀번호를 재설정하려면 <a href="${resetUrl}">여기를 클릭</a>하세요. (1시간 동안 유효)</p>`
  );
};

// 이메일 변경 확인
const sendEmailChangeVerification = async (to, token) => {
  const verifyUrl = `${config.appUrl}/verify-email?token=${token}`;

  await sendEmail(
    to,
    'Prompthub 이메일 주소 변경 확인',
    `새 이메일 주소를 확인하려면 다음 링크를 클릭하세요: ${verifyUrl}`,
    `<p>새 이메일 주소를 확인하려면 <a href="${verifyUrl}">여기를 클릭</a>하세요. (1시간 동안 유효)</p>`
  );
};

module.exports = {
  sendPasswordResetEmail,
  sendEmailChangeVerification,
};
