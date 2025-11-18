// src/modules/settings/settings.service.js
const pool = require('../../shared/db');

function httpError(status, code) {
  const e = new Error(code);
  e.status = status;
  e.code = code;
  return e;
}

// 간단 이메일/유저아이디 검증
function isValidUserId(userid) {
  if (!userid) return false;
  if (userid.length < 3 || userid.length > 50) return false;
  return /^[a-zA-Z0-9._-]+$/.test(userid);
}

function isValidEmail(email) {
  if (!email) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/* 1) 프로필 조회 -------------------------------------------------- */

exports.getProfile = function (userId, cb) {
  pool.query(
    `SELECT userid, display_name, profile_image_url, bio, email
     FROM user
     WHERE id = ?`,
    [userId],
    function (err, rows) {
      if (err) return cb(err);
      if (!rows.length) return cb(httpError(404, 'USER_NOT_FOUND'));

      const u = rows[0];
      cb(null, {
        userid: u.userid,
        display_name: u.display_name,
        profile_image_url: u.profile_image_url,
        bio: u.bio,
        email: u.email,
      });
    }
  );
};

/* 1-2) 프로필 수정 ------------------------------------------------ */

exports.updateProfile = function (userId, body, cb) {
  const userid = body.userid;
  const displayName = body.display_name;
  const profileImageUrl = body.profile_image_url;
  const bio = body.bio;

  if (userid && !isValidUserId(userid)) {
    return cb(httpError(400, 'INVALID_USERID'));
  }

  // userid 중복 체크
  function checkDuplicate(next) {
    if (!userid) return next();
    pool.query(
      'SELECT id FROM user WHERE userid = ? AND id <> ?',
      [userid, userId],
      function (err, rows) {
        if (err) return cb(err);
        if (rows.length) return cb(httpError(409, 'USERID_TAKEN'));
        next();
      }
    );
  }

  checkDuplicate(function () {
    const fields = [];
    const params = [];

    if (userid !== undefined) {
      fields.push('userid = ?');
      params.push(userid);
    }
    if (displayName !== undefined) {
      fields.push('display_name = ?');
      params.push(displayName);
    }
    if (profileImageUrl !== undefined) {
      fields.push('profile_image_url = ?');
      params.push(profileImageUrl);
    }
    if (bio !== undefined) {
      fields.push('bio = ?');
      params.push(bio);
    }

    if (!fields.length) return cb(null, { updated: false });

    fields.push('updated_at = NOW()');

    const sql = `UPDATE user SET ${fields.join(', ')} WHERE id = ?`;
    params.push(userId);

    pool.query(sql, params, function (err2, result) {
      if (err2) return cb(err2);
      cb(null, { updated: true });
    });
  });
};

/* 2) 프라이버시 조회 ---------------------------------------------- */

exports.getPrivacy = function (userId, cb) {
  pool.query(
    `SELECT is_profile_public, show_email, show_activity_status, default_prompt_visibility
     FROM user
     WHERE id = ?`,
    [userId],
    function (err, rows) {
      if (err) return cb(err);
      if (!rows.length) return cb(httpError(404, 'USER_NOT_FOUND'));

      const u = rows[0];
      cb(null, {
        is_profile_public: !!u.is_profile_public,
        show_email: !!u.show_email,
        show_activity_status: !!u.show_activity_status,
        default_prompt_visibility: u.default_prompt_visibility || 'public',
      });
    }
  );
};

/* 2-2) 프라이버시 수정 -------------------------------------------- */

exports.updatePrivacy = function (userId, body, cb) {
  const allowedVis = new Set(['public', 'private', 'unlisted']);

  const fields = [];
  const params = [];

  if (body.is_profile_public !== undefined) {
    fields.push('is_profile_public = ?');
    params.push(body.is_profile_public ? 1 : 0);
  }
  if (body.show_email !== undefined) {
    fields.push('show_email = ?');
    params.push(body.show_email ? 1 : 0);
  }
  if (body.show_activity_status !== undefined) {
    fields.push('show_activity_status = ?');
    params.push(body.show_activity_status ? 1 : 0);
  }
  if (body.default_prompt_visibility !== undefined) {
    const v = String(body.default_prompt_visibility);
    if (!allowedVis.has(v)) {
      return cb(httpError(400, 'INVALID_DEFAULT_VISIBILITY'));
    }
    fields.push('default_prompt_visibility = ?');
    params.push(v);
  }

  if (!fields.length) return cb(null, { updated: false });

  fields.push('updated_at = NOW()');
  const sql = `UPDATE user SET ${fields.join(', ')} WHERE id = ?`;
  params.push(userId);

  pool.query(sql, params, function (err, result) {
    if (err) return cb(err);
    cb(null, { updated: true });
  });
};

/* 3) 환경 조회 ----------------------------------------------------- */

exports.getEnvironment = function (userId, cb) {
  pool.query(
    `SELECT theme, language, timezone FROM user WHERE id = ?`,
    [userId],
    function (err, rows) {
      if (err) return cb(err);
      if (!rows.length) return cb(httpError(404, 'USER_NOT_FOUND'));

      const u = rows[0];
      cb(null, {
        theme: u.theme || 'system',
        language: u.language || 'ko',
        timezone: u.timezone || 'Asia/Seoul',
      });
    }
  );
};

/* 3-2) 환경 수정 --------------------------------------------------- */

exports.updateEnvironment = function (userId, body, cb) {
  const allowedTheme = new Set(['dark', 'light', 'system']);

  const fields = [];
  const params = [];

  if (body.theme !== undefined) {
    const t = String(body.theme);
    if (!allowedTheme.has(t)) {
      return cb(httpError(400, 'INVALID_THEME'));
    }
    fields.push('theme = ?');
    params.push(t);
  }
  if (body.language !== undefined) {
    // 실제로는 지원 언어 리스트를 체크하는 게 좋음. 일단 문자열 그대로 허용
    fields.push('language = ?');
    params.push(String(body.language));
  }
  if (body.timezone !== undefined) {
    // TODO: 타임존 화이트리스트 체크 가능
    fields.push('timezone = ?');
    params.push(String(body.timezone));
  }

  if (!fields.length) return cb(null, { updated: false });

  fields.push('updated_at = NOW()');
  const sql = `UPDATE user SET ${fields.join(', ')} WHERE id = ?`;
  params.push(userId);

  pool.query(sql, params, function (err, result) {
    if (err) return cb(err);
    cb(null, { updated: true });
  });
};

/* 4) 이메일 변경 요청 ---------------------------------------------- */

const crypto = require('crypto');

exports.requestEmailChange = function (userId, body, cb) {
  const newEmail = body && body.new_email;
  if (!isValidEmail(newEmail)) {
    return cb(httpError(400, 'INVALID_EMAIL'));
  }

  // 이메일 중복 체크
  pool.query(
    'SELECT id FROM user WHERE email = ? AND id <> ?',
    [newEmail, userId],
    function (err, rows) {
      if (err) return cb(err);
      if (rows.length) return cb(httpError(409, 'EMAIL_TAKEN'));

      const token = 'eml_' + crypto.randomBytes(24).toString('hex');
      const expiresMinutes = 30;

      pool.query(
        `UPDATE user
         SET pending_email = ?,
             email_verification_token = ?,
             email_verification_expires = DATE_ADD(NOW(), INTERVAL ? MINUTE)
         WHERE id = ?`,
        [newEmail, token, expiresMinutes, userId],
        function (err2, result) {
          if (err2) return cb(err2);

          // 여기서 실제 이메일 전송은 별도 워커/서비스로 넘기는 걸 권장
          // ex) sendEmailChangeMail(newEmail, token);

          cb(null, { sent: true, token }); // 개발/테스트용으로 token 돌려줘도 됨. 운영에서는 빼기.
        }
      );
    }
  );
};

/* 4-2) 이메일 변경 확정 -------------------------------------------- */

exports.confirmEmailChange = function (body, cb) {
  const token = body && body.token;
  if (!token) return cb(httpError(400, 'INVALID_TOKEN'));

  pool.query(
    `SELECT id, pending_email, email_verification_expires
     FROM user
     WHERE email_verification_token = ?`,
    [token],
    function (err, rows) {
      if (err) return cb(err);
      if (!rows.length) return cb(httpError(400, 'INVALID_TOKEN'));

      const u = rows[0];
      const now = new Date();
      const exp = u.email_verification_expires;

      if (!u.pending_email) {
        return cb(httpError(400, 'INVALID_TOKEN'));
      }
      if (exp && now > exp) {
        return cb(httpError(410, 'TOKEN_EXPIRED'));
      }

      const newEmail = u.pending_email;

      // 최종 시점에 한 번 더 중복 체크
      pool.query(
        'SELECT id FROM user WHERE email = ? AND id <> ?',
        [newEmail, u.id],
        function (err2, rows2) {
          if (err2) return cb(err2);
          if (rows2.length) return cb(httpError(409, 'EMAIL_TAKEN'));

          pool.query(
            `UPDATE user
             SET email = ?,
                 pending_email = NULL,
                 email_verification_token = NULL,
                 email_verification_expires = NULL,
                 updated_at = NOW()
             WHERE id = ?`,
            [newEmail, u.id],
            function (err3, result) {
              if (err3) return cb(err3);
              cb(null, { changed: true });
            }
          );
        }
      );
    }
  );
};



exports.deleteAccount = function (userId, cb) {
  if (!userId) {
    return cb(httpError(401, 'UNAUTHORIZED'));
  }

  // (옵션) 트랜잭션으로 묶고 싶으면 beginTransaction 사용해서
  // 연관 테이블들 먼저 삭제 → 마지막에 user 삭제 하는 구조로 바꿔도 됨.
  // 여기서는 FK ON DELETE CASCADE가 달려 있다는 가정으로
  // user만 지우는 간단 버전으로 작성.

  pool.query(
    'DELETE FROM user WHERE id = ?',
    [userId],
    function (err, result) {
      if (err) return cb(err);

      if (result.affectedRows === 0) {
        return cb(httpError(404, 'USER_NOT_FOUND'));
      }

      // 성공
      cb(null, true);
    }
  );
};