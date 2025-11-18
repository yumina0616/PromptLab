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
      const [rows] = await pool.promise().query(
        `
        SELECT
          u.id,
          u.email,
          u.userid,
          u.display_name,
          u.profile_image_url,
          u.bio,
          u.theme,
          u.language,
          u.timezone,
          u.default_prompt_visibility,
          u.is_profile_public,
          u.show_email,
          u.pending_email,

          -- 프롬프트 개수
          (
            SELECT COUNT(*)
            FROM prompt p
            WHERE p.owner_id = u.id
              AND (p.deleted_at IS NULL OR p.deleted_at = 0)
          ) AS prompt_count,

          -- 즐겨찾기 개수
          (
            SELECT COUNT(*)
            FROM favorite f
            JOIN prompt_version v ON v.id = f.prompt_version_id
            JOIN prompt p ON p.id = v.prompt_id
            WHERE p.owner_id = u.id
              AND (p.deleted_at IS NULL OR p.deleted_at = 0)
          ) AS star_count

        FROM user u
        WHERE u.id = ?
        `,
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
    // 🔒 본인 것만 조회 가능
    if (targetUserId !== loggedInUserId) throw new Error('FORBIDDEN');

    const { page = 1, limit = 20, action } = options;
    const offset = (page - 1) * limit;

    // --- 1) 액션 값 검증 ---
    const allowedActions = [
      'create_prompt',
      'update_prompt',
      'star_prompt',
      'fork_prompt',
      'all',
      undefined,
      null,
      '',
    ];

    if (!allowedActions.includes(action)) {
      throw new Error('INVALID_ACTION');
    }

    // --- 2) 각 액션별 쿼리 정의 ---

    // ① 프롬프트 생성
    const qCreate = `
      SELECT 
        'create_prompt' AS action,
        p.id           AS prompt_id,
        p.name         AS prompt_name,
        p.created_at   AS created_at
      FROM prompt p
      WHERE p.owner_id = ?
        AND (p.deleted_at IS NULL OR p.deleted_at = 0)
    `;

    // ② 프롬프트 업데이트 (최초 버전 제외, owner 기준)
    const qUpdate = `
      SELECT
        'update_prompt' AS action,
        p.id            AS prompt_id,
        p.name          AS prompt_name,
        v.created_at    AS created_at
      FROM prompt_version v
      JOIN prompt p ON p.id = v.prompt_id
      WHERE p.owner_id = ?
        AND v.version_number > 1
        AND (p.deleted_at IS NULL OR p.deleted_at = 0)
    `;

    // ③ 프롬프트에 스타
    const qStar = `
      SELECT
        'star_prompt'   AS action,
        p.id            AS prompt_id,
        p.name          AS prompt_name,
        f.created_at    AS created_at
      FROM favorite f
      JOIN prompt_version v ON f.prompt_version_id = v.id
      JOIN prompt p         ON v.prompt_id        = p.id
      WHERE f.user_id = ?
        AND (p.deleted_at IS NULL OR p.deleted_at = 0)
    `;

    // ④ 프롬프트 포크
    const qFork = `
      SELECT
        'fork_prompt'   AS action,
        p.id            AS prompt_id,
        p.name          AS prompt_name,
        f.created_at    AS created_at
      FROM fork f
      JOIN prompt p ON f.target_prompt_id = p.id
      WHERE f.forked_by = ?
        AND (p.deleted_at IS NULL OR p.deleted_at = 0)
    `;

    // --- 3) action 파라미터에 따라 UNION 구성 ---
    let unionSql = '';
    let params = [];

    if (!action || action === 'all') {
      // 네 가지 전부
      unionSql = `
        (${qCreate})
        UNION ALL
        (${qUpdate})
        UNION ALL
        (${qStar})
        UNION ALL
        (${qFork})
      `;
      params = [targetUserId, targetUserId, targetUserId, targetUserId];
    } else if (action === 'create_prompt') {
      unionSql = `(${qCreate})`;
      params = [targetUserId];
    } else if (action === 'update_prompt') {
      unionSql = `(${qUpdate})`;
      params = [targetUserId];
    } else if (action === 'star_prompt') {
      unionSql = `(${qStar})`;
      params = [targetUserId];
    } else if (action === 'fork_prompt') {
      unionSql = `(${qFork})`;
      params = [targetUserId];
    }

    // --- 4) 실제 목록 조회 (정렬 + 페이징) ---
    const listSql = `
      SELECT action, prompt_id, prompt_name, created_at
      FROM (
        ${unionSql}
      ) AS a
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.promise().query(listSql, [...params, limit, offset]);

    // --- 5) total 개수 조회 ---
    const countSql = `
      SELECT COUNT(*) AS total
      FROM (
        ${unionSql}
      ) AS a
    `;
    const [[{ total }]] = await pool.promise().query(countSql, params);

    // --- 6) 응답 포맷 ---
    const items = rows.map((row) => ({
      action: row.action,           // create_prompt / update_prompt / star_prompt / fork_prompt
      prompt_id: row.prompt_id,     // 프롬프트 ID
      prompt_name: row.prompt_name, // 프롬프트 이름
      created_at: row.created_at,   // 해당 활동이 발생한 시각
    }));

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
    };
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