const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Directory paths
const DATA_DIR = path.join(__dirname, 'data');
const MASTER_DIR = path.join(DATA_DIR, 'master');
const MONTHLY_DIR = path.join(DATA_DIR, 'monthly');
const ASSETS_DIR = path.join(DATA_DIR, 'assets');

// Create directories if they don't exist
[DATA_DIR, MASTER_DIR, MONTHLY_DIR, ASSETS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper functions
const getMonthString = (date = new Date()) => {
  return date.toISOString().slice(0, 7); // "2026-02"
};

const getDateString = (date = new Date()) => {
  return date.toISOString().split('T')[0]; // "2026-02-03"
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const monthDir = path.join(ASSETS_DIR, getMonthString());
    if (!fs.existsSync(monthDir)) fs.mkdirSync(monthDir, { recursive: true });
    cb(null, monthDir);
  },
  filename: (req, file, cb) => {
    const { collection, recordId } = req.params;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${collection}_${recordId}_${timestamp}_${safeName}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// ==================== DATA BACKUP ENDPOINTS ====================

// Save single record backup (CREATE, UPDATE, DELETE)
app.post('/backup/:collection', (req, res) => {
  try {
    const { collection } = req.params;
    const { action, data, userId, userName, timestamp } = req.body;
    
    const now = new Date(timestamp || Date.now());
    const monthStr = getMonthString(now);
    const dateStr = getDateString(now);
    
    // === Update Master File ===
    const masterFile = path.join(MASTER_DIR, `${collection}.json`);
    let masterData = [];
    if (fs.existsSync(masterFile)) {
      masterData = JSON.parse(fs.readFileSync(masterFile, 'utf8'));
    }
    
    if (action === 'CREATE') {
      masterData.push({ ...data, _backupTime: now.toISOString() });
    } else if (action === 'UPDATE') {
      const index = masterData.findIndex(item => item.id === data.id);
      if (index !== -1) {
        masterData[index] = { ...data, _backupTime: now.toISOString() };
      } else {
        masterData.push({ ...data, _backupTime: now.toISOString() });
      }
    } else if (action === 'DELETE') {
      masterData = masterData.filter(item => item.id !== data.id);
    }
    
    fs.writeFileSync(masterFile, JSON.stringify(masterData, null, 2));
    
    // === Update Monthly File ===
    const monthlyFile = path.join(MONTHLY_DIR, `${monthStr}_${collection}.json`);
    let monthlyData = {
      month: monthStr,
      collection: collection,
      totalEntries: 0,
      entriesByDate: {}
    };
    
    if (fs.existsSync(monthlyFile)) {
      monthlyData = JSON.parse(fs.readFileSync(monthlyFile, 'utf8'));
    }
    
    // Initialize date array if not exists
    if (!monthlyData.entriesByDate[dateStr]) {
      monthlyData.entriesByDate[dateStr] = [];
    }
    
    // Add entry to the date
    monthlyData.entriesByDate[dateStr].push({
      action,
      data,
      userId,
      userName,
      timestamp: now.toISOString()
    });
    
    // Update total count
    monthlyData.totalEntries = Object.values(monthlyData.entriesByDate)
      .reduce((sum, entries) => sum + entries.length, 0);
    
    fs.writeFileSync(monthlyFile, JSON.stringify(monthlyData, null, 2));
    
    console.log(`✅ Backup: ${collection} | ${action} | ${dateStr}`);
    res.json({ success: true, message: 'Backup saved locally' });
    
  } catch (error) {
    console.error('❌ Backup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Full sync endpoint - sync all data for a collection
app.post('/backup/sync/:collection', (req, res) => {
  try {
    const { collection } = req.params;
    const { data } = req.body;
    
    const masterFile = path.join(MASTER_DIR, `${collection}.json`);
    fs.writeFileSync(masterFile, JSON.stringify(data, null, 2));
    
    console.log(`✅ Full sync: ${collection} (${data.length} records)`);
    res.json({ success: true, message: `Synced ${data.length} records` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ASSET/FILE BACKUP ENDPOINTS ====================

// Upload file backup
app.post('/backup/asset/:collection/:recordId', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const { collection, recordId } = req.params;
    const monthStr = getMonthString();
    
    // Log asset backup to monthly file
    const assetLogFile = path.join(MONTHLY_DIR, `${monthStr}_assets.json`);
    let assetLog = {
      month: monthStr,
      collection: 'assets',
      totalFiles: 0,
      filesByDate: {}
    };
    
    if (fs.existsSync(assetLogFile)) {
      assetLog = JSON.parse(fs.readFileSync(assetLogFile, 'utf8'));
    }
    
    const dateStr = getDateString();
    if (!assetLog.filesByDate[dateStr]) {
      assetLog.filesByDate[dateStr] = [];
    }
    
    assetLog.filesByDate[dateStr].push({
      collection,
      recordId,
      originalName: req.file.originalname,
      savedAs: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      timestamp: new Date().toISOString()
    });
    
    assetLog.totalFiles = Object.values(assetLog.filesByDate)
      .reduce((sum, files) => sum + files.length, 0);
    
    fs.writeFileSync(assetLogFile, JSON.stringify(assetLog, null, 2));
    
    console.log(`✅ Asset backup: ${req.file.filename}`);
    res.json({ 
      success: true, 
      filename: req.file.filename,
      path: req.file.path 
    });
    
  } catch (error) {
    console.error('❌ Asset backup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload multiple files
app.post('/backup/assets/:collection/:recordId', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }
    
    const { collection, recordId } = req.params;
    const monthStr = getMonthString();
    const dateStr = getDateString();
    
    // Log all assets
    const assetLogFile = path.join(MONTHLY_DIR, `${monthStr}_assets.json`);
    let assetLog = {
      month: monthStr,
      collection: 'assets',
      totalFiles: 0,
      filesByDate: {}
    };
    
    if (fs.existsSync(assetLogFile)) {
      assetLog = JSON.parse(fs.readFileSync(assetLogFile, 'utf8'));
    }
    
    if (!assetLog.filesByDate[dateStr]) {
      assetLog.filesByDate[dateStr] = [];
    }
    
    req.files.forEach(file => {
      assetLog.filesByDate[dateStr].push({
        collection,
        recordId,
        originalName: file.originalname,
        savedAs: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
        timestamp: new Date().toISOString()
      });
    });
    
    assetLog.totalFiles = Object.values(assetLog.filesByDate)
      .reduce((sum, files) => sum + files.length, 0);
    
    fs.writeFileSync(assetLogFile, JSON.stringify(assetLog, null, 2));
    
    console.log(`✅ Asset backup: ${req.files.length} files`);
    res.json({ 
      success: true, 
      count: req.files.length,
      files: req.files.map(f => ({ filename: f.filename, path: f.path }))
    });
    
  } catch (error) {
    console.error('❌ Asset backup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== READ ENDPOINTS ====================

// Get all records from a collection
app.get('/backup/read/:collection', (req, res) => {
  try {
    const { collection } = req.params;
    const { userId } = req.query;
    const masterFile = path.join(MASTER_DIR, `${collection}.json`);
    
    if (!fs.existsSync(masterFile)) {
      console.log(`📥 Read: ${collection} (no data yet)`);
      return res.json([]);
    }
    
    let data = JSON.parse(fs.readFileSync(masterFile, 'utf8'));
    
    // Filter by userId if provided
    if (userId) {
      data = data.filter(item => item.userId === userId);
    }
    
    console.log(`📥 Read: ${collection} (${data.length} records)`);
    res.json(data);
  } catch (error) {
    console.error('❌ Read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single record by ID
app.get('/backup/read/:collection/:id', (req, res) => {
  try {
    const { collection, id } = req.params;
    const masterFile = path.join(MASTER_DIR, `${collection}.json`);
    
    if (!fs.existsSync(masterFile)) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const data = JSON.parse(fs.readFileSync(masterFile, 'utf8'));
    const record = data.find(item => item.id === id);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    console.log(`📥 Read: ${collection}/${id}`);
    res.json(record);
  } catch (error) {
    console.error('❌ Read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search/query records
app.post('/backup/query/:collection', (req, res) => {
  try {
    const { collection } = req.params;
    const { filters, sortBy, sortOrder } = req.body;
    const masterFile = path.join(MASTER_DIR, `${collection}.json`);
    
    if (!fs.existsSync(masterFile)) {
      return res.json([]);
    }
    
    let data = JSON.parse(fs.readFileSync(masterFile, 'utf8'));
    
    // Apply filters
    if (filters && typeof filters === 'object') {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          data = data.filter(item => item[key] === value);
        }
      });
    }
    
    // Apply sorting
    if (sortBy) {
      data.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    console.log(`📥 Query: ${collection} (${data.length} results)`);
    res.json(data);
  } catch (error) {
    console.error('❌ Query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== UTILITY ENDPOINTS ====================

// Get backup stats
app.get('/backup/stats', (req, res) => {
  try {
    const stats = {
      master: {},
      monthly: [],
      assets: { totalFiles: 0, byMonth: {} }
    };
    
    // Count master records
    if (fs.existsSync(MASTER_DIR)) {
      fs.readdirSync(MASTER_DIR).forEach(file => {
        if (file.endsWith('.json')) {
          const data = JSON.parse(fs.readFileSync(path.join(MASTER_DIR, file), 'utf8'));
          stats.master[file.replace('.json', '')] = Array.isArray(data) ? data.length : 0;
        }
      });
    }
    
    // List monthly files
    if (fs.existsSync(MONTHLY_DIR)) {
      stats.monthly = fs.readdirSync(MONTHLY_DIR).filter(f => f.endsWith('.json'));
    }
    
    // Count assets
    if (fs.existsSync(ASSETS_DIR)) {
      fs.readdirSync(ASSETS_DIR).forEach(month => {
        const monthDir = path.join(ASSETS_DIR, month);
        if (fs.statSync(monthDir).isDirectory()) {
          const files = fs.readdirSync(monthDir);
          stats.assets.byMonth[month] = files.length;
          stats.assets.totalFiles += files.length;
        }
      });
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== START SERVER ====================
const PORT = 3099;
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         📦 ON CLICKS LOCAL BACKUP SERVER RUNNING             ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server URL  : http://localhost:${PORT}                         ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Master Data : ${MASTER_DIR}`);
  console.log(`║  Monthly Logs: ${MONTHLY_DIR}`);
  console.log(`║  Assets      : ${ASSETS_DIR}`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📝 Waiting for backup requests...');
  console.log('');
});
