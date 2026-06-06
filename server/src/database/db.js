const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db;
let SQL;

const dataDir = path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'dried_fruit_store.db');

async function initDatabase() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  return db;
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      saveDatabase();
      resolve(results);
    } catch (err) {
      reject(err);
    }
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      
      let result = null;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      stmt.free();
      
      saveDatabase();
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      db.run(sql, params);
      saveDatabase();
      resolve({ 
        lastID: db.exec('SELECT last_insert_rowid() as id')[0].values[0][0],
        changes: db.getRowsModified ? db.getRowsModified() : 0
      });
    } catch (err) {
      reject(err);
    }
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    try {
      const results = db.exec(sql);
      saveDatabase();
      resolve(results);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  initDatabase,
  all,
  get,
  run,
  exec,
  db: () => db
};
