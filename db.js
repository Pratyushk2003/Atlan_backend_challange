const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    user: 'myproject',
    password: 'pratyush',
    port: 5433,
    database: 'myproject'
});

pool.connect();
// Listen for the 'connect' event
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

// Listen for the 'error' event
pool.on('error', (err) => {
    console.error('Error during PostgreSQL database connection:', err.stack);
});

module.exports = pool;
