// server/config/db.js
// ★ ใช้ Pool แทน createConnection เพื่อ auto-reconnect และรองรับ concurrent queries
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'loandd_db',
    waitForConnections: true,
    connectionLimit: 10,        // รองรับ connection พร้อมกันสูงสุด 10
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // ★ ป้องกัน mysql2 แปลง TINYINT(1) เป็น boolean อัตโนมัติ
    typeCast: function (field, next) {
        if (field.type === 'TINY' && field.length === 1) {
            const val = field.string()
            return val === null ? null : Number(val)
        }
        return next()
    },
});

// ★ ทดสอบ connection ตอน startup
pool.getConnection((err, conn) => {
    if (err) {
        console.error('❌ เชื่อมต่อ Database ไม่สำเร็จ:', err.message);
    } else {
        console.log('✅ เชื่อมต่อ MySQL สำเร็จแล้ว!');
        conn.release();
    }
});

module.exports = pool;
