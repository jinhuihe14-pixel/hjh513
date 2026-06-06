const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db;
let SQL;

const dataDir = path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'dried_fruit_store.db');

const operationQueue = [];
let isProcessing = false;

let saveTimeout = null;
let needsSave = false;

function enqueueOperation(fn) {
  return new Promise((resolve, reject) => {
    operationQueue.push({ fn, resolve, reject });
    processQueue();
  });
}

function processQueue() {
  if (isProcessing || operationQueue.length === 0) {
    return;
  }
  
  isProcessing = true;
  const { fn, resolve, reject } = operationQueue.shift();
  
  try {
    const result = fn();
    resolve(result);
  } catch (err) {
    reject(err);
  } finally {
    isProcessing = false;
    processQueue();
  }
}

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
  if (saveTimeout) {
    return;
  }
  
  saveTimeout = setTimeout(() => {
    try {
      if (needsSave) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        needsSave = false;
      }
    } catch (err) {
      console.error('保存数据库失败:', err.message);
    } finally {
      saveTimeout = null;
      if (needsSave) {
        saveDatabase();
      }
    }
  }, 100);
}

function markDirty() {
  needsSave = true;
  saveDatabase();
}

function all(sql, params = []) {
  return enqueueOperation(() => {
    let stmt;
    try {
      stmt = db.prepare(sql);
      stmt.bind(params);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      
      return results;
    } finally {
      if (stmt) {
        stmt.free();
      }
    }
  });
}

function get(sql, params = []) {
  return enqueueOperation(() => {
    let stmt;
    try {
      stmt = db.prepare(sql);
      stmt.bind(params);
      
      let result = null;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      
      return result;
    } finally {
      if (stmt) {
        stmt.free();
      }
    }
  });
}

function run(sql, params = []) {
  return enqueueOperation(() => {
    db.run(sql, params);
    markDirty();
    
    let result;
    let stmt;
    try {
      stmt = db.prepare('SELECT last_insert_rowid() as id');
      stmt.step();
      result = stmt.getAsObject();
    } finally {
      if (stmt) {
        stmt.free();
      }
    }
    
    return { 
      lastID: result.id,
      changes: db.getRowsModified ? db.getRowsModified() : 0
    };
  });
}

function exec(sql) {
  return enqueueOperation(() => {
    const results = db.exec(sql);
    markDirty();
    return results;
  });
}

function forceSave() {
  return enqueueOperation(() => {
    if (needsSave) {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
      needsSave = false;
    }
    return true;
  });
}

module.exports = {
  initDatabase,
  all,
  get,
  run,
  exec,
  forceSave,
  db: () => db
};
