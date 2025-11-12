// 기존의 'mysql' 대신 'mysql2' 패키지의 Promise API를 사용합니다.
const mysql = require('mysql2/promise');

// DB_PORT를 숫자로 변환하여 사용합니다. (Railway의 28232 포트)
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;

const pool = mysql.createPool({
  // .env 파일의 환경변수를 사용합니다.
  host: process.env.DB_HOST,
  port: dbPort,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // Connection Pool 설정
  connectionLimit: 10,
  charset: 'utf8mb4',
});


pool.getConnection()
    .then(connection => {
        console.log("🚀 DB 연결 풀 생성 및 테스트 성공!");
        connection.release();
    })
    .catch(err => {
        console.error("❌ DB 연결 풀 생성 오류:", err.message);
    });

module.exports = pool;