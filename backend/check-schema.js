require('dotenv').config();
const db = require('./config/database');

(async () => {
  try {
    const [tables] = await db.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'reservations'`,
      [process.env.DB_NAME]
    );

    if (tables.length === 0) {
      console.log('❌ Table "reservations" ABSENTE dans la base:', process.env.DB_NAME);
      process.exit(2);
    }

    console.log('✅ Table "reservations" trouvée.');

    const [columns] = await db.execute(`SHOW COLUMNS FROM reservations`);
    console.log('🧱 Colonnes:');
    columns.forEach(c => console.log(` - ${c.Field} ${c.Type} ${c.Null === 'NO' ? 'NOT NULL' : ''}`));

    const [rows] = await db.execute(`SELECT * FROM reservations ORDER BY created_at DESC LIMIT 1`);
    console.log('📦 Exemple de ligne (si existe):', rows[0] || 'Aucune ligne');

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur check-schema:', err.message);
    process.exit(1);
  }
})();
