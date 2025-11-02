const mysql = require('mysql2');
require('dotenv').config();
const db = require('./config/database');

db.execute('SELECT 1')
  .then(() => {
    console.log('✅ Connexion MySQL OK');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur MySQL:', err);
    process.exit(1);
  });
