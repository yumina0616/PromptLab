const pool = require('../../shared/db');

// (참고) User API와 Auth API는 강하게 연결되어 있으므로
// 모든 user 관련 DB 쿼리는 이 파일(users.service)에 모읍니다.

const userService = {

  // --- Auth API용 함수들 ---

  getUserByEmailWithPassword: async (email) => {
    try {
      const [rows] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
      return rows[0];
    } catch (error) { throw new Error('Error finding user by email'); }
  },
  
  getUserByUserid: async (userid) => {
    try {
      const [rows] = await pool.query('SELECT id FROM user WHERE userid = ?', [userid]);
      return rows[0];
    } catch (error) { throw new Error('Error finding user by userid'); }
  },

  // 'GET /me' (Auth API) 및 'GET /users/:userid' (User API)에서 공통 사용
  getUserByIdForProfile: async (id) => {
    try {
      const [rows] = await pool.query(
        'SELECT id, email, userid, display_name, profile_image_url, bio, theme, language, timezone, default_prompt_visibility, is_profile_public, show_email, pending_email FROM user WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) { throw new Error('Error finding user for profile'); }
  },
  
  getUserByIdWithRefreshToken: async (id) => { 
    try {
      const [rows] = await pool.query('SELECT id, email, refresh_token FROM user WHERE id = ?', [id]);
      return rows[0];
    } catch (error) { throw new Error('Error finding user by id'); }
  },

  createUser: async ({ email, hashedPassword, userid, displayName }) => {
    try {
      const [result] = await pool.query(
        'INSERT INTO user (email, password, userid, display_name, login_type) VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, userid, displayName, 'local'] 
      );
      // PDF 스펙 응답에 필요한 필드만 조회
      const [rows] = await pool.query(
        'SELECT id, email, userid, display_name FROM user WHERE id = ?',
        [result.insertId]
      );
      return rows[0];
    } catch (error) { throw new Error('Error creating user'); }
  },
  
  updateRefreshToken: async (userId, refreshToken) => { 
    try {
      await pool.query('UPDATE user SET refresh_token = ? WHERE id = ?', [refreshToken, userId]);
    } catch (error) { throw new Error('Error updating refresh token'); }
  },
  
  updatePassword: async (userId, hashedPassword) => { 
    try {
      await pool.query('UPDATE user SET password = ? WHERE id = ?', [hashedPassword, userId]);
    } catch (error) { throw new Error('Error updating password'); }
  },

  // --- OAuth용 함수들 ---
  
  getUserByEmail: async (email) => {
    try {
      const [rows] = await pool.query(
        'SELECT id, email, display_name, login_type, profile_image_url FROM user WHERE email = ?',
        [email]
      );
      return rows[0];
    } catch (error) { throw new Error('Error finding user by email'); }
  },

  createOauthUser: async ({ email, displayName, profileImageUrl, loginType, userid }) => {
    try {
      const [result] = await pool.query(
        'INSERT INTO user (email, display_name, profile_image_url, login_type, userid) VALUES (?, ?, ?, ?, ?)',
        [email, displayName, profileImageUrl, loginType, userid]
      );
      return { id: result.insertId, email, displayName, profileImageUrl, loginType, userid };
    } catch (error) { throw new Error('Error creating oauth user'); }
  },

  getOauthAccount: async (provider, providerUserId) => {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM oauth_account WHERE provider = ? AND provider_user_id = ?',
        [provider, providerUserId]
      );
      return rows[0];
    } catch (error) { throw new Error('Error finding oauth account'); }
  },

  createOauthAccount: async ({ userId, provider, providerUserId, accessToken, refreshToken }) => {
    try {
      await pool.query(
        'INSERT INTO oauth_account (user_id, provider, provider_user_id, access_token, refresh_token) VALUES (?, ?, ?, ?, ?)',
        [userId, provider, providerUserId, accessToken, refreshToken]
      );
    } catch (error) { throw new Error('Error creating oauth account'); }
  },

  deleteOauthAccount: async (userId, provider) => {
    try {
      const [result] = await pool.query(
        'DELETE FROM oauth_account WHERE user_id = ? AND provider = ?',
        [userId, provider]
      );
      return result.affectedRows > 0; // true (삭제 성공) or false (연결 없음)
    } catch (error) { throw new Error('Error deleting oauth account'); }
  },


  // --- [신규] User API용 함수들 ---

  /**
   * 1) 공개 프로필 조회
   * @param {string} userid - URL의 :userid 파라미터
   */
  getPublicProfileByUserid: async (userid) => {
    try {
      // (TODO: stats(prompts, stars, forks)는 별도 조인/집계 쿼리 필요. 우선 기본 정보만)
      const [rows] = await pool.query(
        `SELECT 
          id, userid, display_name, profile_image_url, bio, 
          is_profile_public, show_email
         FROM user WHERE userid = ?`,
        [userid]
      );
      
      const user = rows[0];
      if (!user) return null;

      // (임시) stats 객체 - 실제로는 JOIN이나 COUNT 쿼리로 계산해야 함
      user.stats = { prompts: 0, stars: 0, forks: 0 }; 
      
      // (스펙) visibility 객체로 묶기
      user.visibility = {
        is_profile_public: user.is_profile_public,
        show_email: user.show_email,
      };
      
      // (스펙) 민감 정보 제거
      delete user.is_profile_public;
      delete user.show_email;
      
      return user;
    } catch (error) {
      throw new Error('Error getting public profile');
    }
  },

  /**
   * 2) 프로필 수정
   * @param {number} userId - 본인 ID (토큰에서)
   * @param {object} updateData - { userid, display_name, bio, profile_image_url }
   */
  updateProfile: async (userId, updateData) => {
    try {
      // (주의) email 필드는 updateData에 포함되면 안 됨. 별도 API(이메일 변경)로 처리.
      const { email, ...safeUpdateData } = updateData;

      if (Object.keys(safeUpdateData).length === 0) {
        return null; // 변경할 데이터가 없음
      }

      const [result] = await pool.query(
        'UPDATE user SET ? WHERE id = ?',
        [safeUpdateData, userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      // (오류 처리) 409 USERID_TAKEN은 컨트롤러에서 미리 검사해야 함
      throw new Error('Error updating profile');
    }
  },

  /**
   * 2.5) 프로필 수정 (이메일 변경 요청)
   * (SQL 스키마 변경이 필요)
   */
  requestEmailChange: async (userId, newEmail, token, expires) => {
    try {
      await pool.query(
        'UPDATE user SET pending_email = ?, email_verification_token = ?, email_verification_expires = ? WHERE id = ?',
        [newEmail, token, expires, userId]
      );
    } catch (error) {
      throw new Error('Error setting pending email');
    }
  },

  /**
   * 8) 계정 삭제
   */
  deleteUser: async (userId) => {
    try {
      // (주의) DB 스키마의 ON DELETE CASCADE/SET NULL 정책이 모든 것을 처리함
      const [result] = await pool.query(
        'DELETE FROM user WHERE id = ?',
        [userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting user');
    }
  },
  
  // (TODO: 3, 4, 5, 6 API - prompts, favorites, forks, activity - 를 위한 함수들)
  // 이 함수들은 prompt, favorite, fork, activity 테이블에 대한 복잡한 JOIN 쿼리가 필요함.

};

module.exports = userService;