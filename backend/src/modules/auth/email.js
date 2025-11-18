// backend/src/modules/auth/email.js
const { Resend } = require('resend');
const config = require('../../config');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 비밀번호 재설정 메일 발송
 * @param {string} to 사용자의 이메일
 * @param {string} resetUrl 비밀번호 재설정 링크
 */
exports.sendPasswordResetEmail = async (to, resetUrl) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'PromptLab <no-reply@example.com>',
      to,
      subject: 'Prompthub 비밀번호 재설정 요청',
      html: `
        <p>비밀번호 재설정을 요청하셨습니다.</p>
        <p>아래 링크를 클릭해서 새 비밀번호를 설정해주세요.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>만약 본인이 요청한 것이 아니라면 이 메일을 무시하셔도 됩니다.</p>
      `,
    });

    if (error) {
      console.error('[Email] Resend error:', error);
      throw error;
    }

    console.log('[Email] Password reset mail sent:', data?.id, 'to', to);
  } catch (err) {
    console.error('[Email] Failed to send password reset email:', err);
    // 여기는 네가 정책 정하면 됨
    // 1) throw 해서 500으로 실패 처리하거나
    // 2) 그냥 지나가고 "메일 보냈다고" 응답할 수도 있음
    throw err;
  }
};
