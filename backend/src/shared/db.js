// shared/db.js
const mysql = require('mysql2');
// const config = require('../config'); // ◀ (삭제) DATABASE_URL을 안 쓰므로 config 불필요

const dbPort = process.env.DB_PORT
  ? parseInt(process.env.DB_PORT, 10)
  : 3306;

// ▼▼▼ 1. 첫 번째 'pool' 정의 (이것을 사용) ▼▼▼
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: dbPort,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  charset: 'utf8mb4',
  waitForConnections: true, // (추가) 연결 풀 옵션
  queueLimit: 0,           // (추가) 연결 풀 옵션
});

// ▼▼▼ 2. 연결 테스트 (이것도 사용) ▼▼▼
pool.getConnection((err, conn) => {
  if (err) {
    console.error('❌ DB 연결 풀 생성 오류:', err.message);
  } else {
    console.log('🚀 DB 연결 풀 생성 및 테스트 성공!');
    conn.release();
  }
}); // ◀ (수정) 닫는 괄호 ');' 추가

/*
// ▼▼▼ 3. 두 번째 'pool' 정의와 관련된 코드는 전부 삭제 ▼▼▼

// [수정] mysql2/promise는 URL을 바로 썼지만,
// ... (이하 51줄까지의 모든 코드 삭제) ...
const pool = mysql.createPool({
  ...dbOptions,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
*/

// [중요]
// 이 pool은 기본적으로 "Callback" 방식입니다.
// async/await을 쓰려면, 사용하는 곳에서 'pool.promise()'를 호출해야 합니다.

module.exports = pool;