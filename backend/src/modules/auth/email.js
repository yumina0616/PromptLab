const nodemailer = require('nodemailer');
const config = require('../../config');
const { ApiError } = require('../../shared/error');

// 1. Nodemailer "transport" 생성 (Gmail SMTP 설정)
// transport는 이메일을 실제로 보내는 객체입니다.
const transport = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

// 2. transport가 준비되었는지 확인 (서버 시작 시 확인용 - 옵션)
transport.verify()
  .then(() => {
    console.log('Email transport is ready (using Gmail SMTP).');
  })
  .catch(err => {
    // .env 파일에 이메일 정보가 없으면 여기 경고가 뜸 (정상)
    console.warn(`Warning: Email transport failed to verify. Password reset emails may not work. Error: ${err.message}`);
  });

/**
 * 비밀번호 재설정 이메일을 보냅니다.
 * @param {string} to - 수신자 이메일 주소
 * @param {string} token - 비밀번호 재설정 토큰
 */
const sendPasswordResetEmail = async (to, token) => {
  // 1. 프론트엔드 URL 생성 (예: http://localhost:3000/reset-password?token=...)
  // config.appUrl은 .env의 APP_URL (프론트엔드 주소)입니다.
  const resetLink = `${config.appUrl}/reset-password?token=${token}`;

  // 2. 이메일 내용
  const mailOptions = {
    from: config.email.from, // .env의 EMAIL_FROM
    to: to,
    subject: 'Prompthub 비밀번호 재설정 요청',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Prompthub 비밀번호 재설정</h2>
        <p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 비밀번호를 재설정하세요. 이 링크는 10분간 유효합니다.</p>
        <a href="${resetLink}" 
           style="display: inline-block; padding: 10px 20px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;">
           비밀번호 재설정하기
        </a>
        <p>이 링크가 작동하지 않으면, 다음 URL을 브라우저에 복사하여 붙여넣으세요:</p>
        <p>${resetLink}</p>
        <hr>
        <p style="font-size: 0.9em; color: #777;">이 요청을 하지 않으셨다면, 이 이메일을 무시하셔도 됩니다.</p>
      </div>
    `,
    text: `비밀번호 재설정을 위해 다음 링크를 방문하세요: ${resetLink}`,
  };

  try {
    // 3. 이메일 발송
    await transport.sendMail(mailOptions);
  } catch (error) {
    console.error(`Failed to send password reset email to ${to}:`, error);
    // 이메일 발송에 실패해도 사용자에게는 알리지 않는 것이 보안상 좋을 수 있으나,
    // 여기서는 일단 에러를 던져서 서버 로그에 남도록 합니다.
    throw new ApiError(500, 'EMAIL_SEND_FAILED', 'Failed to send password reset email.');
  }
};

module.exports = {
  sendPasswordResetEmail,
};