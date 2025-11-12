require('dotenv').config();

const pool = require('./shared/db');

async function testDbConnection() {
    console.log("DB 연결 테스트 시작...");

    try {
        const [rows] = await pool.query('SELECT NOW() AS now, "Connection Successful" AS status');
      
        console.log('✅ DB 연결 성공!');
        console.log('   - 현재 DB 시간:', rows[0].now);
        console.log('   - 상태 메시지:', rows[0].status);

    } catch (err) {
        console.error('❌ DB 연결 실패:', err.message);
        console.error('   - 코드:', err.code);
        
    } finally {

        if (pool) {
            await pool.end();
            console.log('➡️ DB 연결 풀 종료.');
        }

    }
}

testDbConnection();