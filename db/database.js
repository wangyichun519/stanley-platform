const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fss = require('fs');
const DB_PATH = path.join(__dirname, 'platform.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
let db;
function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    const schema = fss.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    console.log('資料庫初始化完成');
  }
  return db;
}
module.exports = { getDb };
