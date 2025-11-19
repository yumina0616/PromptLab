const pool = require('../../shared/db');

/**
 * Repository functions for interacting with the rag_guidelines table.
 */
exports.insertGuideline = async ({ title, content, embedding }) => {
  const [result] = await pool
    .promise()
    .query(
      `INSERT INTO rag_guidelines (title, content, embedding)
       VALUES (?, ?, ?)`,
      [title, content, JSON.stringify(embedding || [])]
    );

  return result.insertId;
};

exports.updateGuideline = async (id, { title, content, embedding }) => {
  await pool
    .promise()
    .query(
      `UPDATE rag_guidelines
       SET title = COALESCE(?, title),
           content = COALESCE(?, content),
           embedding = COALESCE(?, embedding),
           updated_at = NOW()
       WHERE id = ?`,
      [
        title || null,
        content || null,
        embedding ? JSON.stringify(embedding) : null,
        id,
      ]
    );
};

exports.listGuidelines = async () => {
  const [rows] = await pool.promise().query(
    `SELECT id, title, content, created_at, updated_at
     FROM rag_guidelines
     ORDER BY created_at DESC`
  );

  return rows;
};

exports.listGuidelinesWithEmbeddings = async () => {
  const [rows] = await pool.promise().query(
    `SELECT id, title, content, embedding, created_at, updated_at
     FROM rag_guidelines
     ORDER BY created_at DESC`
  );

  return rows.map((row) => ({
    ...row,
    embedding: row.embedding ? JSON.parse(row.embedding) : null,
  }));
};
