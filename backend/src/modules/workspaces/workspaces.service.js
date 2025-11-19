// 콜백 풀이 아니라 Promise 풀을 사용
const pool = require('../../shared/db').promise();
const {
  NotFoundError,
  ConflictError,
  BadRequestError,
  UnauthorizedError,
} = require('../../shared/error');
const uuid = require('uuid');
const config = require('../../config');
const { generateSlug } = require('../../shared/utils');
const userService = require('../users/users.service');
const emailService = require('../auth/email');
const promptsService = require('../prompts/prompt.service');
const notificationService = require('../notifications/notification.service');

/**
 * 헬퍼 함수: DB 트랜잭션을 시작합니다.
 */
const beginTransaction = async () => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  return conn;
};

// --- 1. Workspace (기본 CRUD) ---

/**
 * 워크스페이스 단일 조회 (권한 미들웨어용)
 */

const createPromptWithFirstVersionAsync = (userId, body) =>
  new Promise((resolve, reject) => {
    promptsService.createPromptWithFirstVersion(userId, body, (err, result) => {
      if (err) return reject(err);
      resolve(result); // { id, owner_id, latest_version_id }
    });
  });

// 이름 기반 기본 slug를 만들고, DB에서 중복을 체크해서
// 필요하면 -1, -2, -3 ... 를 붙여서 유니크 slug를 만든다.
async function generateUniqueSlug(conn, name) {
  // name 이 비어있으면 기본값
  const base = generateSlug(name || 'workspace');

  let slug = base;
  let counter = 1;

  while (true) {
    const [rows] = await conn.query(
      'SELECT id FROM workspaces WHERE slug = ? LIMIT 1',
      [slug]
    );

    if (rows.length === 0) {
      return slug;
    }

    counter += 1;
    slug = `${base}-${counter}`;
  }
}

exports.getWorkspaceById = async (workspaceId) => {
  const [rows] = await pool.execute(
    'SELECT id, kind, name, description, slug, created_by FROM workspaces WHERE id = ?',
    [workspaceId]
  );
  return rows[0] || null;
};

exports.createWorkspace = async (data, userId) => {
  const conn = await beginTransaction();
  try {
    let slug;

    if (data.slug) {
      // 클라에서 slug를 직접 넘긴 경우 → 그 값으로 중복 체크
      slug = data.slug;

      const [existing] = await conn.query(
        'SELECT id FROM workspaces WHERE slug = ?',
        [slug]
      );

      if (existing.length > 0) {
        throw new ConflictError('SLUG_TAKEN', 'Workspace slug is already taken.');
      }
    } else {
      // slug 를 안 보내면 이름 기반으로 유니크 slug 자동 생성
      slug = await generateUniqueSlug(conn, data.name);
    }

    // 3. 워크스페이스 생성 (description 추가)
    const [result] = await conn.execute(
      'INSERT INTO workspaces (kind, name, description, slug, created_by) VALUES (?, ?, ?, ?, ?)',
      [data.kind, data.name, data.description || null, slug, userId]
    );
    const workspaceId = result.insertId;

    // 4. 생성자를 멤버로 추가 (역할: admin)
    await conn.execute(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)',
      [workspaceId, userId, 'admin']
    );

    await conn.commit();

    return {
      id: workspaceId,
      kind: data.kind,
      name: data.name,
      description: data.description || null,
      slug: slug,
      created_by: userId,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/**
 * 사용자가 속한 워크스페이스 목록을 조회합니다. (스펙 2)
 */
exports.getMyWorkspaces = async (userId, pagination) => {
  if (!userId) {
    throw new UnauthorizedError('UNAUTHORIZED', 'User id is missing');
  }

  const q = pagination.q ? `%${pagination.q}%` : '%';
  const sortField = pagination.sort === 'name' ? 'w.name' : 'wm.joined_at';

  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;
  const offset = (page - 1) * limit;

  const query = `
    SELECT 
      w.id, w.kind, w.name, w.description, w.slug, wm.role
    FROM 
      workspace_members wm
    JOIN 
      workspaces w ON wm.workspace_id = w.id
    WHERE 
      wm.user_id = ? AND w.name LIKE ?
    ORDER BY 
      ${sortField} DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [items] = await pool.execute(query, [userId, q]);

  const countSql = `
    SELECT COUNT(w.id) AS total
    FROM workspace_members wm
    JOIN workspaces w ON wm.workspace_id = w.id
    WHERE wm.user_id = ? AND w.name LIKE ?
  `;
  const [countRows] = await pool.execute(countSql, [userId, q]);
  const total = countRows[0]?.total || 0;

  return {
    items,
    page,
    limit,
    total,
  };
};

/**
 * 워크스페이스 상세 정보를 조회합니다. (스펙 3)
 */
exports.getWorkspaceDetail = async (workspaceId) => {
  const [workspaces] = await pool.execute(
    'SELECT id, kind, name, description, slug, created_by, created_at FROM workspaces WHERE id = ?',
    [workspaceId]
  );
  const workspace = workspaces[0];
  if (!workspace) return null;

  // 생성자 정보 로드
  const [creatorRows] = await pool.execute(
    'SELECT id, userid FROM user WHERE id = ?',
    [workspace.created_by]
  );
  const createdByUser = creatorRows[0] || null;

  // 멤버 수
  const [[{ memberCount }]] = await pool.query(
    'SELECT COUNT(*) AS memberCount FROM workspace_members WHERE workspace_id = ?',
    [workspaceId]
  );

  // 공유 프롬프트 수
  const [[{ promptCount }]] = await pool.query(
    'SELECT COUNT(*) AS promptCount FROM workspace_prompts WHERE workspace_id = ?',
    [workspaceId]
  );

  return {
    ...workspace,
    created_by: createdByUser ? { id: createdByUser.id, userid: createdByUser.userid } : null,
    members: { count: memberCount },
    prompts: { count: promptCount },
  };
};

/**
 * 워크스페이스 정보를 수정합니다. (스펙 4)
 */
exports.updateWorkspace = async (workspaceId, data) => {
  const conn = await beginTransaction();
  try {
    const updates = [];
    const values = [];

    if (data.name) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if (typeof data.description !== 'undefined') {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (data.slug) {
      const [existing] = await conn.query(
        'SELECT id FROM workspaces WHERE slug = ? AND id != ?',
        [data.slug, workspaceId]
      );
      if (existing.length > 0) {
        throw new ConflictError('SLUG_TAKEN', 'Workspace slug is already taken.');
      }
      updates.push('slug = ?');
      values.push(data.slug);
    }

    if (updates.length === 0) {
      throw new BadRequestError('NO_CHANGES', 'No fields to update.');
    }

    const query = `UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`;
    await conn.execute(query, [...values, workspaceId]);

    const [updated] = await conn.execute(
      'SELECT id, kind, name, description, slug FROM workspaces WHERE id = ?',
      [workspaceId]
    );

    await conn.commit();
    return updated[0];
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/**
 * 워크스페이스를 삭제합니다. (스펙 5)
 */
exports.deleteWorkspace = async (workspaceId) => {
  const conn = await beginTransaction();
  try {
    const [result] = await conn.execute('DELETE FROM workspaces WHERE id = ?', [workspaceId]);
    if (result.affectedRows === 0) {
      throw new NotFoundError('WORKSPACE_NOT_FOUND', 'Workspace not found.');
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// --- 2. Members (멤버 관리) ---

/**
 * 워크스페이스의 멤버 역할을 조회합니다.
 */
exports.getMemberRole = async (workspaceId, userId) => {
  // 개인 워크스페이스의 경우, 생성자는 항상 admin/owner 역할이라고 가정
  const [workspace] = await pool.execute(
    'SELECT id, kind, created_by FROM workspaces WHERE id = ?',
    [workspaceId]
  );
  if (workspace.length > 0 && workspace[0].kind === 'personal' && workspace[0].created_by === userId) {
    return 'admin';
  }

  const [member] = await pool.execute(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
    [workspaceId, userId]
  );
  return member.length > 0 ? member[0].role : null;
};

/**
 * 멤버 목록을 조회합니다. (스펙 6)
 */
exports.getMemberList = async (workspaceId) => {
  const query = `
        SELECT 
            wm.role, wm.joined_at, u.id, u.userid, u.display_name
        FROM 
            workspace_members wm
        JOIN 
            user u ON wm.user_id = u.id
        WHERE 
            wm.workspace_id = ?
        ORDER BY 
            wm.role DESC, wm.joined_at ASC
    `;
  const [rows] = await pool.execute(query, [workspaceId]);

  return rows.map((row) => ({
    user: {
      id: row.id,
      userid: row.userid,
      display_name: row.display_name,
    },
    role: row.role,
    joined_at: row.joined_at,
  }));
};

/**
 * 멤버를 직접 추가합니다. (스펙 7)
 */
exports.addMember = async (workspaceId, email, role) => {
  const conn = await beginTransaction();
  try {
    // 1. 이메일로 사용자 찾기
    const user = await userService.getUserByEmail(email);
    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', 'User with this email does not exist.');
    }

    // 2. 이미 멤버인지 확인
    const [existing] = await conn.execute(
      'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, user.id]
    );
    if (existing.length > 0) {
      throw new ConflictError('ALREADY_MEMBER', 'User is already a member of this workspace.');
    }

    // 3. 멤버 추가
    await conn.execute(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)',
      [workspaceId, user.id, role]
    );

    await conn.commit();
    return { workspace_id: workspaceId, user_id: user.id, role };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/**
 * 멤버 역할을 변경합니다. (스펙 8)
 */
exports.updateMemberRole = async (workspaceId, targetUserId, newRole) => {
  const [result] = await pool.execute(
    'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?',
    [newRole, workspaceId, targetUserId]
  );
  if (result.affectedRows === 0) {
    throw new NotFoundError('MEMBER_NOT_FOUND', 'User is not a member of this workspace.');
  }
  return { workspace_id: workspaceId, user_id: targetUserId, role: newRole };
};

/**
 * 멤버를 제거합니다. (스펙 9)
 */
exports.removeMember = async (workspaceId, targetUserId) => {
  const [result] = await pool.execute(
    'DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
    [workspaceId, targetUserId]
  );
  if (result.affectedRows === 0) {
    throw new NotFoundError('MEMBER_NOT_FOUND', 'User is not a member of this workspace.');
  }
};

// --- 3. Invites (초대) ---

/**
 * 초대를 발송합니다. (스펙 10)
 * 변경됨: 초대를 보내는 즉시 해당 이메일의 유저를 워크스페이스 멤버로 추가하고,
 * workspace_invites 의 status 는 'accepted' 로 표기합니다.
 */
exports.sendInvite = async (workspaceId, inviterId, email, role) => {
  const conn = await beginTransaction();
  try {
    // ... (1. 이메일로 사용자 찾기)
    const user = await userService.getUserByEmail(email);
    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', 'User with this email does not exist.');
    }

    // 2. 이미 멤버인지 확인 (중복 초대 방지)
    // 3. 이미 초대 대기 중인지 확인 (중복 발송 방지, 필요 시)

    // 4. 초대 레코드 생성 (기록용, 기본 status = pending)
    const token = uuid.v4();
    await conn.execute(
      'INSERT INTO workspace_invites (workspace_id, invited_by, invited_email, role, token, expires_at, status) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?)',
      [workspaceId, inviterId, email, role, token, 'pending'] // 👈 status 필드 추가 및 'pending' 명시
    );

    // 5. 알림 전송 로직
    const workspaceInfo = await exports.getWorkspaceById(workspaceId);

// 5. 알림 서비스 호출
    await notificationService.createNotification(conn, { 
        userId: user.id, // 초대받는 사람
        type: 'invite', 
        title: `${workspaceInfo.name} 워크스페이스 초대`, // 👈 workspaceInfo에서 name 속성 사용
        body: `${role} 권한으로 워크스페이스에 추가되었습니다.`,
        entity_type: 'workspace_invite',
        entity_id: token, // 초대 토큰 또는 레코드 ID를 연결
        actor_user_id: inviterId, // inviterId 사용
        workspace_id: workspaceId,
    });

// 4. 초대와 동시에 워크스페이스 멤버로 추가 (자동 수락/복원)
    await conn.execute(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)',
        [workspaceId, user.id, role]
    );

    // 5. 초대 status 를 accepted 로 변경 (복원)
    await conn.execute('UPDATE workspace_invites SET status = "accepted" WHERE token = ?', [
        token,
    ]);

    // 6. 이메일 전송(선택) - 여기서는 알림 용도로만 사용
    const inviteUrl = `${config.appUrl}/workspace`; // 더 이상 토큰 수락용 URL은 필요 없음
    console.log(
      `[WORKSPACE AUTO-INVITE] ${email} added to workspace ${workspaceId} as ${role}.`
    );
    // 필요하면 실제 메일 내용도 바꾸기
    // await emailService.sendInviteEmail(email, inviteUrl, /* workspace name */);

    await conn.commit();
    return { token, status: 'pending', invited_email: email, role, user_id: user.id };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/**
 * 초대 목록을 조회합니다. (스펙 11)
 * 변경됨: 이제 status = 'accepted' 인 초대 기록만 반환합니다.
 */
exports.getInviteList = async (workspaceId) => {
  const [rows] = await pool.execute(
    'SELECT invited_email, role, token, status FROM workspace_invites WHERE workspace_id = ? AND status = "accepted"',
    [workspaceId]
  );
  return rows;
};

/**
 * 토큰으로 초대 정보를 조회합니다.
 * (현재는 accept/reject/cancel 플로우가 비활성화되어 사용하지 않음)
 */
exports.getInviteByToken = async (token) => {
  const [invites] = await pool.execute(
    'SELECT * FROM workspace_invites WHERE token = ? AND status = "pending" AND expires_at > NOW()',
    [token]
  );
  return invites[0] || null;
};

/**
 * 초대를 수락합니다. (스펙 12)
 * 현재 컨트롤러에서 비활성화되어 실제로는 사용되지 않습니다.
 */
exports.acceptInvite = async (token, userId) => {
  const conn = await beginTransaction();
  try {
    const invite = await exports.getInviteByToken(token);
    if (!invite) {
      throw new BadRequestError(
        'INVALID_OR_EXPIRED_TOKEN',
        'Invitation is invalid or expired.'
      );
    }

    const [existing] = await conn.execute(
      'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [invite.workspace_id, userId]
    );
    if (existing.length > 0) {
      await conn.commit();
      return { joined: true, workspace_id: invite.workspace_id, role: invite.role };
    }

    await conn.execute(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)',
      [invite.workspace_id, userId, invite.role]
    );

    await conn.execute('UPDATE workspace_invites SET status = "accepted" WHERE token = ?', [
      token,
    ]);

    await conn.commit();
    return { joined: true, workspace_id: invite.workspace_id, role: invite.role };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/**
 * 초대를 거절합니다. (스펙 12) - 현재 비활성화
 */
exports.rejectInvite = async (token) => {
  const [result] = await pool.execute(
    'UPDATE workspace_invites SET status = "rejected" WHERE token = ? AND status = "pending"',
    [token]
  );
  if (result.affectedRows === 0) {
    throw new BadRequestError(
      'INVALID_OR_EXPIRED_TOKEN',
      'Invitation is invalid or expired.'
    );
  }
  return { rejected: true };
};

/**
 * 초대를 취소합니다. (스펙 13) - 현재 컨트롤러/미들웨어에서 비활성화
 */
exports.cancelInvite = async (token) => {
  const [result] = await pool.execute(
    'DELETE FROM workspace_invites WHERE token = ? AND status = "pending"',
    [token]
  );
  if (result.affectedRows === 0) {
    throw new NotFoundError('INVITE_NOT_FOUND', 'Active invitation not found.');
  }
};

// --- 4. Shared Prompts (공유된 프롬프트) ---

exports.createPromptInWorkspace = async (workspaceId, userId, body) => {
  const wsId = Number(workspaceId);
  if (!wsId) {
    throw new BadRequestError('INVALID_WORKSPACE_ID', 'Invalid workspace id.');
  }

  const [wsRows] = await pool.execute('SELECT id FROM workspaces WHERE id = ?', [wsId]);
  if (wsRows.length === 0) {
    throw new NotFoundError('WORKSPACE_NOT_FOUND', 'Workspace not found.');
  }

  const promptBody = {
    name: body.name,
    description: body.description,
    visibility: 'private',
    tags: body.tags || [],
    content: body.content,
    commit_message: body.commit_message,
    category_code: body.category_code,
    is_draft: false,
    model_setting: body.model_setting,
  };

  const prompt = await createPromptWithFirstVersionAsync(userId, promptBody);

  const role = body.role || 'editor';

  await pool.execute(
    'INSERT INTO workspace_prompts (workspace_id, prompt_id, role, added_by) VALUES (?, ?, ?, ?)',
    [wsId, prompt.id, role, userId]
  );

  return {
    workspace_id: wsId,
    prompt_id: prompt.id,
    role,
    prompt,
  };
};

exports.getSharedPromptList = async (workspaceId, pagination = {}) => {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;
  const offset = (page - 1) * limit;

  const q = pagination.q ? `%${pagination.q}%` : '%';
  const sortField = pagination.sort === 'name' ? 'p.name' : 'wp.added_at';

  const query = `
    SELECT 
      wp.role,
      wp.added_at, 
      p.id AS prompt_id,
      p.name AS prompt_name,
      p.owner_id,
      v.id AS latest_version_id,
      v.version_number,
      v.created_at AS version_created_at,
      u.userid AS owner_userid,
      0 AS stars,
      0 AS forks,
      NULL AS tags_list,
      u_added.userid AS added_by_userid
    FROM 
      workspace_prompts wp
    JOIN 
      prompt p ON wp.prompt_id = p.id
    JOIN 
      user u ON p.owner_id = u.id
    JOIN 
      user u_added ON wp.added_by = u_added.id
    LEFT JOIN 
      prompt_version v ON p.latest_version_id = v.id
    WHERE 
      wp.workspace_id = ? 
      AND p.name LIKE ?
    ORDER BY 
      ${sortField} DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [rows] = await pool.execute(query, [workspaceId, q]);

  const [[{ total }]] = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM workspace_prompts wp
      JOIN prompt p ON wp.prompt_id = p.id
      WHERE wp.workspace_id = ? AND p.name LIKE ?
    `,
    [workspaceId, q]
  );

  return {
    items: rows.map((row) => ({
      prompt: {
        id: row.prompt_id,
        name: row.prompt_name,
        owner: { userid: row.owner_userid },
      },
      role: row.role,
      added_by: { userid: row.added_by_userid },
      added_at: row.added_at,
      latest_version: row.latest_version_id
        ? {
            id: row.latest_version_id,
            version_number: row.version_number,
            created_at: row.version_created_at,
          }
        : null,
      stars: row.stars,
      forks: row.forks,
      tags: row.tags_list ? row.tags_list.split(',') : [],
    })),
    page,
    limit,
    total,
  };
};

/**
 * 프롬프트를 워크스페이스에 공유합니다. (스펙 15)
 */
exports.sharePrompt = async (workspaceId, promptId, sharerId, role) => {
  const conn = await beginTransaction();
  try {
    const [prompt] = await conn.execute('SELECT owner_id FROM prompt WHERE id = ?', [promptId]);
    if (prompt.length === 0) {
      throw new NotFoundError('PROMPT_NOT_FOUND', 'Prompt does not exist.');
    }

    const [existing] = await conn.execute(
      'SELECT 1 FROM workspace_prompts WHERE workspace_id = ? AND prompt_id = ?',
      [workspaceId, promptId]
    );
    if (existing.length > 0) {
      throw new ConflictError('ALREADY_SHARED', 'Prompt is already shared with this workspace.');
    }

    // 1. workspace_prompts에 공유 정보 삽입
    await conn.execute(
      'INSERT INTO workspace_prompts (workspace_id, prompt_id, role, added_by) VALUES (?, ?, ?, ?)',
      [workspaceId, promptId, role, sharerId]
    );

    // 2. ★ [추가] 공유하는 순간 Prompt의 visibility를 'private'으로 강제 변경
    await conn.execute(
      'UPDATE prompt SET visibility = ? WHERE id = ?',
      ['private', promptId]
    );
    
    await conn.commit();
    return { workspace_id: workspaceId, prompt_id: promptId, role };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/**
 * 공유된 프롬프트의 권한을 변경합니다. (스펙 16)
 */
exports.updateSharedPromptRole = async (workspaceId, promptId, newRole) => {
  const [result] = await pool.execute(
    'UPDATE workspace_prompts SET role = ? WHERE workspace_id = ? AND prompt_id = ?',
    [newRole, workspaceId, promptId]
  );
  if (result.affectedRows === 0) {
    throw new NotFoundError('SHARE_NOT_FOUND', 'Prompt is not shared with this workspace.');
  }
  return { workspace_id: workspaceId, prompt_id: promptId, role: newRole };
};

/**
 * 프롬프트 공유를 해제합니다. (스펙 17)
 */
exports.unsharePrompt = async (workspaceId, promptId) => {
  const [result] = await pool.execute(
    'DELETE FROM workspace_prompts WHERE workspace_id = ? AND prompt_id = ?',
    [workspaceId, promptId]
  );
  if (result.affectedRows === 0) {
    throw new NotFoundError('SHARE_NOT_FOUND', 'Prompt is not shared with this workspace.');
  }
};
