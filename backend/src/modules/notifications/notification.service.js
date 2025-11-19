const pool = require('../../shared/db');

function httpError(status, msg) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

// 기본 설정값
const DEFAULT_SETTINGS = {
  email_comment: true,
  email_star_fork: true,
  email_follower: true,
  email_weekly_digest: false,
  push_enable: false,
};

// 1) 설정 조회
exports.getSettings = function (userId, cb) {
  pool.query(
    'SELECT * FROM notification_setting WHERE user_id = ?',
    [userId],
    function (err, rows) {
      if (err) return cb(err);

      if (!rows.length) {
        // 레코드 없으면 기본값 반환
        return cb(null, {
          ...DEFAULT_SETTINGS,
          updated_at: null,
        });
      }

      const s = rows[0];
      cb(null, {
        email_comment: !!s.email_comment,
        email_star_fork: !!s.email_star_fork,
        email_follower: !!s.email_follower,
        email_weekly_digest: !!s.email_weekly_digest,
        push_enable: !!s.push_enable,
        updated_at: s.updated_at,
      });
    }
  );
};

// 2) 설정 변경 (partial patch, upsert)
exports.updateSettings = function (userId, patch, cb) {
  if (!patch || typeof patch !== 'object') {
    return cb(httpError(400, 'INVALID_BODY'));
  }

  // 허용된 필드만
  const fields = [
    'email_comment',
    'email_star_fork',
    'email_follower',
    'email_weekly_digest',
    'push_enable',
  ];

  const data = {};
  let hasAny = false;

  for (const f of fields) {
    if (patch[f] !== undefined) {
      data[f] = !!patch[f]; // boolean 강제
      hasAny = true;
    }
  }
  if (!hasAny) {
    return cb(httpError(400, 'NO_FIELDS'));
  }

  // 기존 값 가져와서 merge 후 upsert
  exports.getSettings(userId, function (err, current) {
    if (err) return cb(err);

    const merged = {
      email_comment: data.email_comment ?? current.email_comment,
      email_star_fork: data.email_star_fork ?? current.email_star_fork,
      email_follower: data.email_follower ?? current.email_follower,
      email_weekly_digest:
        data.email_weekly_digest ?? current.email_weekly_digest,
      push_enable: data.push_enable ?? current.push_enable,
    };

    const sql = `
      INSERT INTO notification_setting
        (user_id, email_comment, email_star_fork, email_follower,
         email_weekly_digest, push_enable, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        email_comment       = VALUES(email_comment),
        email_star_fork     = VALUES(email_star_fork),
        email_follower      = VALUES(email_follower),
        email_weekly_digest = VALUES(email_weekly_digest),
        push_enable         = VALUES(push_enable),
        updated_at          = NOW()
    `;

    pool.query(
      sql,
      [
        userId,
        merged.email_comment ? 1 : 0,
        merged.email_star_fork ? 1 : 0,
        merged.email_follower ? 1 : 0,
        merged.email_weekly_digest ? 1 : 0,
        merged.push_enable ? 1 : 0,
      ],
      function (err2) {
        if (err2) return cb(err2);

        // 최종값 다시 리턴
        exports.getSettings(userId, cb);
      }
    );
  });
};

// 3) 알림 목록
exports.listNotifications = function (userId, query, cb) {
  try {
    const where = ['user_id = ?'];
    const params = [userId];

    // unread=true
    if (query && query.unread === 'true') {
      where.push('is_read = 0');
    }
    // type=comment|star|fork|...
    if (query && query.type) {
      where.push('type = ?');
      params.push(query.type);
    }
    // from,to (날짜)
    if (query && query.from) {
      where.push('created_at >= ?');
      params.push(query.from);
    }
    if (query && query.to) {
      where.push('created_at <= ?');
      params.push(query.to);
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const page = query && query.page ? Number(query.page) : 1;
    const limit = query && query.limit ? Number(query.limit) : 20;
    const offset = (page - 1) * limit;

    // total
    pool.query(
      `SELECT COUNT(*) AS cnt FROM notification ${whereSql}`,
      params,
      function (err, countRows) {
        if (err) return cb(err);
        const total = countRows[0] ? Number(countRows[0].cnt) : 0;

        pool.query(
          `
          SELECT id, type, title, body,
                 entity_type, entity_id,
                 actor_user_id, workspace_id,
                 is_read, created_at
          FROM notification
          ${whereSql}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `,
          [...params, limit, offset],
          function (err2, rows) {
            if (err2) return cb(err2);

            const items = rows.map((r) => ({
              id: r.id,
              type: r.type,
              title: r.title,
              body: r.body,
              entity: {
                entity_type: r.entity_type,
                entity_id: r.entity_id,
              },
              actor_user_id: r.actor_user_id,
              workspace_id: r.workspace_id,
              is_read: !!r.is_read,
              created_at: r.created_at,
            }));

            cb(null, { items, page, limit, total });
          }
        );
      }
    );
  } catch (e) {
    cb(e);
  }
};

// 4) 안읽은 개수
exports.getUnreadCount = function (userId, cb) {
  pool.query(
    'SELECT COUNT(*) AS cnt FROM notification WHERE user_id = ? AND is_read = 0',
    [userId],
    function (err, rows) {
      if (err) return cb(err);
      const unread = rows[0] ? Number(rows[0].cnt) : 0;
      cb(null, { unread });
    }
  );
};

// 5) 단건 읽음 처리
exports.markRead = function (userId, notifId, cb) {
  pool.query(
    'UPDATE notification SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notifId, userId],
    function (err, result) {
      if (err) return cb(err);
      if (!result.affectedRows) {
        return cb(httpError(404, 'NOTIFICATION_NOT_FOUND'));
      }
      exports.getUnreadCount(userId, cb);
    }
  );
};

// 6) 모두 읽음 처리 (선택 type 필터)
exports.markAllRead = function (userId, body, cb) {
  let sql =
    'UPDATE notification SET is_read = 1 WHERE user_id = ? AND is_read = 0';
  const params = [userId];

  if (body && Array.isArray(body.type) && body.type.length) {
    sql += ' AND type IN (' + body.type.map(() => '?').join(',') + ')';
    params.push(...body.type);
  }

  pool.query(sql, params, function (err, result) {
    if (err) return cb(err);
    exports.getUnreadCount(userId, function (err2, r) {
      if (err2) return cb(err2);
      cb(null, { updated: result.affectedRows, unread_count: r.unread });
    });
  });
};

// 7) 단건 삭제
exports.deleteOne = function (userId, notifId, cb) {
  pool.query(
    'DELETE FROM notification WHERE id = ? AND user_id = ?',
    [notifId, userId],
    function (err, result) {
      if (err) return cb(err);
      if (!result.affectedRows) {
        return cb(httpError(404, 'NOTIFICATION_NOT_FOUND'));
      }
      cb(null, true);
    }
  );
};

// 8) 인박스 비우기
exports.clearNotifications = function (userId, query, cb) {
  let sql = 'DELETE FROM notification WHERE user_id = ?';
  const params = [userId];

  if (query && query.type) {
    sql += ' AND type = ?';
    params.push(query.type);
  }

  if (query && query.before) {
    sql += ' AND created_at < ?';
    params.push(query.before);
  }

  // 쿼리 아무것도 없으면 → 읽은 알림만 삭제
  if (!(query && (query.type || query.before))) {
    sql += ' AND is_read = 1';
  }

  pool.query(sql, params, function (err) {
    if (err) return cb(err);
    cb(null, true);
  });
};

/**
 * 알림 생성 함수 (트랜잭션(conn)을 사용하여 호출)
 * @param {object} conn - MySQL 연결 객체 (트랜잭션을 위해)
 * @param {object} notifData - 알림 데이터
 */
exports.createNotification = async (conn, notifData) => {
    // notifData: { userId, type, title, body, entityType, entityId, actorUserId, workspaceId }
    
    // 알림 생성 SQL
    const sql = `
        INSERT INTO notification 
        (user_id, type, title, body, entity_type, entity_id, 
         actor_user_id, workspace_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const params = [
        notifData.userId,
        notifData.type,
        notifData.title,
        notifData.body,
        notifData.entity_type, // 'entity_type'으로 수정
        notifData.entity_id,   // 'entity_id'로 수정
        notifData.actor_user_id,
        notifData.workspace_id,
    ];

    // conn.execute를 사용 (트랜잭션 내부에서 실행되도록)
    await conn.execute(sql, params);
};
