const pool = require('../../shared/db');
const crypto = require('crypto');

// [중요]
// pool은 콜백 기반. async/await을 위해 .promise()를 사용한다.

const userService = {

  // --- Auth API용 함수들 ---

  getUserByEmailWithPassword: async (email) => {
    try {
      const [rows] = await pool.promise().query(
        'SELECT id, email, userid, display_name, password, login_type, refresh_token FROM user WHERE email = ?',
        [email]
      );
      return rows[0];
    } catch (error) {
      console.error('getUserByEmailWithPassword error:', error);  // ✅ 실제 에러 로그
      throw error; // 굳이 새 Error 만들지 말고 원본을 던져
    }
  },

  
  getUserByUserid: async (userid) => {
    try {
      // [수정] pool.promise().query
      const [rows] = await pool.promise().query('SELECT id FROM user WHERE userid = ?', [userid]);
      return rows[0];
    } catch (error) { throw new Error('Error finding user by userid'); }
  },

  getUserByIdForProfile: async (id) => {
    try {
      // [수정] pool.promise().query
      const [rows] = await pool.promise().query(
        'SELECT id, email, userid, display_name, profile_image_url, bio, theme, language, timezone, default_prompt_visibility, is_profile_public, show_email, pending_email FROM user WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) { throw new Error('Error finding user for profile'); }
  },
  
  getUserByIdWithRefreshToken: async (id) => { 
    try {
      // [수정] pool.promise().query
      const [rows] = await pool.promise().query('SELECT id, email, refresh_token FROM user WHERE id = ?', [id]);
      return rows[0];
    } catch (error) { throw new Error('Error finding user by id'); }
  },

  getUserByIdWithPassword: async (id) => {
    try {
      const [rows] = await pool.promise().query(
        'SELECT id, email, userid, display_name, password, login_type, refresh_token FROM user WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      throw new Error('Error finding user by id with password');
    }
  },


  createUser: async ({ email, hashedPassword, userid, displayName }) => {
    try {
      // [수정] pool.promise().query
      const [result] = await pool.promise().query(
        'INSERT INTO user (email, password, userid, display_name, login_type) VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, userid, displayName, 'local'] 
      );
      // [수정] pool.promise().query
      const [rows] = await pool.promise().query(
        'SELECT id, email, userid, display_name FROM user WHERE id = ?',
        [result.insertId]
      );
      return rows[0];
    } catch (error) { throw new Error('Error creating user'); }
  },
  
  updateRefreshToken: async (userId, refreshToken) => { 
    try {
      // [수정] pool.promise().query
      await pool.promise().query('UPDATE user SET refresh_token = ? WHERE id = ?', [refreshToken, userId]);
    } catch (error) { throw new Error('Error updating refresh token'); }
  },
  
  updatePassword: async (userId, hashedPassword) => { 
    try {
      // [수정] pool.promise().query
      await pool.promise().query('UPDATE user SET password = ? WHERE id = ?', [hashedPassword, userId]);
    } catch (error) { throw new Error('Error updating password'); }
  },

  // --- OAuth용 함수들 ---
  
  getUserByEmail: async (email) => {
    try {
      // [수정] pool.promise().query
      const [rows] = await pool.promise().query(
        'SELECT id, email, display_name, login_type, profile_image_url FROM user WHERE email = ?',
        [email]
      );
      return rows[0];
    } catch (error) { throw new Error('Error finding user by email'); }
  },

  createOauthUser: async ({ email, displayName, profileImageUrl, loginType, userid }) => {
    try {
      // [수정] pool.promise().query
      const [result] = await pool.promise().query(
        'INSERT INTO user (email, display_name, profile_image_url, login_type, userid) VALUES (?, ?, ?, ?, ?)',
        [email, displayName, profileImageUrl, loginType, userid]
      );
      return { id: result.insertId, email, displayName, profileImageUrl, loginType, userid };
    } catch (error) { throw new Error('Error creating oauth user'); }
  },

  getOauthAccount: async (provider, providerUserId) => {
    try {
      // [수정] pool.promise().query
      const [rows] = await pool.promise().query(
        'SELECT * FROM oauth_account WHERE provider = ? AND provider_user_id = ?',
        [provider, providerUserId]
      );
      return rows[0];
    } catch (error) { throw new Error('Error finding oauth account'); }
  },

  createOauthAccount: async ({ userId, provider, providerUserId, accessToken, refreshToken }) => {
    try {
      // [수정] pool.promise().query
      await pool.promise().query(
        'INSERT INTO oauth_account (user_id, provider, provider_user_id, access_token, refresh_token) VALUES (?, ?, ?, ?, ?)',
        [userId, provider, providerUserId, accessToken, refreshToken]
      );
    } catch (error) { throw new Error('Error creating oauth account'); }
  },

  deleteOauthAccount: async (userId, provider) => {
    try {
      // [수정] pool.promise().query
      const [result] = await pool.promise().query(
        'DELETE FROM oauth_account WHERE user_id = ? AND provider = ?',
        [userId, provider]
      );
      return result.affectedRows > 0;
    } catch (error) { throw new Error('Error deleting oauth account'); }
  },

  // --- [신규] User API용 함수들 ---

  getPublicProfileByUserid: async (userid) => {
    try {
      // [수정] pool.promise().query
      const [rows] = await pool.promise().query(
        `SELECT 
          id, userid, display_name, profile_image_url, bio, 
          is_profile_public, show_email
         FROM user WHERE userid = ?`,
        [userid]
      );
      
      const user = rows[0];
      if (!user) return null;
      user.stats = { prompts: 0, stars: 0, forks: 0 }; 
      user.visibility = {
        is_profile_public: user.is_profile_public,
        show_email: user.show_email,
      };
      delete user.is_profile_public;
      delete user.show_email;
      return user;
    } catch (error) {
      throw new Error('Error getting public profile');
    }
  },

  updateProfile: async (userId, updateData) => {
    try {
      const { email, ...safeUpdateData } = updateData;
      if (Object.keys(safeUpdateData).length === 0) return null;

      // [수정] pool.promise().query
      const [result] = await pool.promise().query(
        'UPDATE user SET ? WHERE id = ?',
        [safeUpdateData, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating profile');
    }
  },

  requestEmailChange: async (userId, newEmail, token, expires) => {
    try {
      // [수정] pool.promise().query
      await pool.promise().query(
        'UPDATE user SET pending_email = ?, email_verification_token = ?, email_verification_expires = ? WHERE id = ?',
        [newEmail, token, expires, userId]
      );
    } catch (error) {
      throw new Error('Error setting pending email');
    }
  },

  getPromptsByUserid: async (targetUserId, loggedInUserId, options) => {
    const { page = 1, limit = 20, sort = 'recent', q, category } = options;
    const offset = (page - 1) * limit;
    const isSelf = targetUserId === loggedInUserId;
    let visibilityConditions = "p.visibility = 'public' OR p.visibility = 'unlisted'";
    if (isSelf) visibilityConditions = "1=1";
    let orderByClause = "ORDER BY p.updated_at DESC";
    if (sort === 'popular') orderByClause = "ORDER BY stars DESC, p.updated_at DESC";
    let filterConditions = "";
    const queryParams = [targetUserId];
    const visibilitySql = `AND (${visibilityConditions})`;
    if (q) {
      filterConditions += " AND (p.name LIKE ? OR p.description LIKE ?)";
      queryParams.push(`%${q}%`, `%${q}%`);
    }
    if (category) {
      filterConditions += " AND pv.category_id = ?";
      queryParams.push(category);
    }
    const mainQuery = `
      SELECT
        p.id, p.name, p.description, p.visibility, p.updated_at,
        pv.id as latest_version_id,
        pv.version_number as latest_version_number,
        pv.created_at as latest_version_created_at,
        (SELECT COUNT(DISTINCT f.user_id) FROM favorite f WHERE f.prompt_version_id = pv.id) as stars,
        (SELECT COUNT(DISTINCT k.forked_by) FROM fork k WHERE k.source_version_id = pv.id) as forks,
        (SELECT JSON_ARRAYAGG(t.name) FROM prompt_tag pt JOIN tag t ON pt.tag_id = t.id WHERE pt.prompt_id = p.id) as tags
      FROM prompt p
      JOIN prompt_version pv ON p.latest_version_id = pv.id
      WHERE p.owner_id = ?
        ${visibilitySql} ${filterConditions}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;
    queryParams.push(limit, offset);
    const countQuery = `
      SELECT COUNT(p.id) as total
      FROM prompt p
      LEFT JOIN prompt_version pv ON p.latest_version_id = pv.id
      WHERE p.owner_id = ?
        ${visibilitySql} ${filterConditions}
    `;
    const countParams = queryParams.slice(0, -2); 
    try {
      // [수정] pool.promise().query
      const [items] = await pool.promise().query(mainQuery, queryParams);
      const [countRows] = await pool.promise().query(countQuery, countParams);
      const formattedItems = items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        latest_version: {
          id: item.latest_version_id,
          version_number: item.latest_version_number,
          created_at: item.latest_version_created_at,
        },
        visibility: item.visibility,
        tags: item.tags || [],
        stars: item.stars || 0,
        forks: item.forks || 0,
        updated_at: item.updated_at,
      }));
      return { items: formattedItems, total: countRows[0].total };
    } catch (error) {
      console.error("Error in getPromptsByUserid:", error);
      throw new Error('Error getting prompts');
    }
  },

  getFavoritesByUserid: async (targetUserId, loggedInUserId, options) => {
    if (targetUserId !== loggedInUserId) throw new Error('FORBIDDEN');
    const { page = 1, limit = 20, sort = 'recent' } = options;
    const offset = (page - 1) * limit;
    let orderByClause = "ORDER BY f.created_at DESC";
    const mainQuery = `
      SELECT
        pv.id as prompt_version_id, p.id as prompt_id, p.name as prompt_name,
        pv.version_number, f.created_at as starred_at,
        u.userid as owner_userid, u.display_name as owner_display_name
      FROM favorite f
      JOIN prompt_version pv ON f.prompt_version_id = pv.id
      JOIN prompt p ON pv.prompt_id = p.id
      JOIN user u ON p.owner_id = u.id
      WHERE f.user_id = ? ${orderByClause} LIMIT ? OFFSET ?
    `;
    const countQuery = `SELECT COUNT(*) as total FROM favorite f WHERE f.user_id = ?`;
    try {
      // [수정] pool.promise().query
      const [items] = await pool.promise().query(mainQuery, [targetUserId, limit, offset]);
      const [countRows] = await pool.promise().query(countQuery, [targetUserId]);
      const formattedItems = items.map(item => ({
        prompt_version_id: item.prompt_version_id,
        prompt: { id: item.prompt_id, name: item.prompt_name },
        version_number: item.version_number,
        starred_at: item.starred_at,
        owner: { userid: item.owner_userid, display_name: item.owner_display_name },
      }));
      return { items: formattedItems, total: countRows[0].total };
    } catch (error) {
      console.error("Error in getFavoritesByUserid:", error);
      throw new Error('Error getting favorites');
    }
  },

  getForksByUserid: async (targetUserId, loggedInUserId, options) => {
    if (targetUserId !== loggedInUserId) throw new Error('FORBIDDEN');
    const { page = 1, limit = 20, sort = 'recent' } = options;
    const offset = (page - 1) * limit;
    let orderByClause = "ORDER BY f.created_at DESC";
    const mainQuery = `
      SELECT
        p.id as target_prompt_id, p.name, f.source_version_id,
        f.created_at as forked_at, u_source.userid as source_owner_userid
      FROM fork f
      JOIN prompt p ON f.target_prompt_id = p.id
      JOIN prompt_version pv_source ON f.source_version_id = pv_source.id
      JOIN prompt p_source ON pv_source.prompt_id = p_source.id
      JOIN user u_source ON p_source.owner_id = u_source.id
      WHERE f.forked_by = ? ${orderByClause} LIMIT ? OFFSET ?
    `;
    const countQuery = `SELECT COUNT(*) as total FROM fork f WHERE f.forked_by = ?`;
    try {
      // [수정] pool.promise().query
      const [items] = await pool.promise().query(mainQuery, [targetUserId, limit, offset]);
      const [countRows] = await pool.promise().query(countQuery, [targetUserId]);
      const formattedItems = items.map(item => ({
        target_prompt_id: item.target_prompt_id,
        name: item.name,
        source_version_id: item.source_version_id,
        forked_at: item.forked_at,
        source_owner: { userid: item.source_owner_userid },
      }));
      return { items: formattedItems, total: countRows[0].total };
    } catch (error) {
      console.error("Error in getForksByUserid:", error);
      throw new Error('Error getting forks');
    }
  },

  getActivityByUserid: async (targetUserId, loggedInUserId, options) => {
    if (targetUserId !== loggedInUserId) throw new Error('FORBIDDEN');
    const { page = 1, limit = 20, action } = options;
    const offset = (page - 1) * limit;
    let filterConditions = "";
    const queryParams = [targetUserId];
    if (action) {
      filterConditions += " AND a.action = ?";
      queryParams.push(action);
    }
    const mainQuery = `
      SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at
      FROM activity a
      WHERE a.user_id = ? ${filterConditions}
      ORDER BY a.created_at DESC LIMIT ? OFFSET ?
    `;
    queryParams.push(limit, offset);
    const countQuery = `SELECT COUNT(*) as total FROM activity a WHERE a.user_id = ? ${filterConditions}`;
    const countParams = queryParams.slice(0, -2);
    try {
      // [수정] pool.promise().query
      const [items] = await pool.promise().query(mainQuery, queryParams);
      const [countRows] = await pool.promise().query(countQuery, countParams);
      const formattedItems = items.map(item => ({
        ...item,
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
      }));
      return { items: formattedItems, total: countRows[0].total };
    } catch (error) {
      console.error("Error in getActivityByUserid:", error);
      throw new Error('Error getting activity');
    }
  },

  requestExport: async (userId) => {
    try {
      const jobId = `exp_${crypto.randomBytes(16).toString('hex')}`;
      return { job_id: jobId, status: "queued" };
    } catch (error) {
      throw new Error('Error requesting export');
    }
  },

  deleteUser: async (userId) => {
    try {
      // [수정] pool.promise().query
      const [result] = await pool.promise().query(
        'DELETE FROM user WHERE id = ?',
        [userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting user');
    }
  },

};

module.exports = userService;