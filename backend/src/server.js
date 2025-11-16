const app = require('./app');
const config = require('./config');
const pool = require('./shared/db');

// DB 연결 테스트 (콜백 스타일)
pool.getConnection((err, conn) => {
  if (err) {
    console.error('MySQL Connection Error:', err.message);
    process.exit(1);
  }

  console.log('MySQL Connected...');
  if (conn) conn.release();

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
});
