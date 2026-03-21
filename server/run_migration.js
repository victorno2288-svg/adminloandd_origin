const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'loandd_db'
};

async function runMigration() {
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected to MySQL database');

        const sql = `ALTER TABLE loan_requests 
                     ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50) NULL, 
                     ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NULL, 
                     ADD COLUMN IF NOT EXISTS bank_book_file VARCHAR(500) NULL`;

        await connection.execute(sql);
        console.log('✅ Migration executed successfully!');
        console.log('   - Added column: bank_account_number (VARCHAR(50))');
        console.log('   - Added column: bank_name (VARCHAR(100))');
        console.log('   - Added column: bank_book_file (VARCHAR(500))');

        await connection.end();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
