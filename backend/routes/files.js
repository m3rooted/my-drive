const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const auth = require('../middleware/auth');
const FileModel = require('../models/File');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
});

// Upload file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { folderId } = req.body;

    const fileData = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      userId: req.user.id,
      folderId: folderId || null
    };

    const file = await FileModel.createFile(fileData);

    res.status(201).json({
      message: 'File uploaded successfully',
      file
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get files and folders
router.get('/', auth, async (req, res) => {
  try {
    const { folderId } = req.query;
    
    const files = await FileModel.getFilesByUserId(req.user.id, folderId || null);
    const folders = await FileModel.getFoldersByUserId(req.user.id, folderId || null);

    res.json({
      files,
      folders,
      currentFolder: folderId || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// Download file
router.get('/download/:id', auth, async (req, res) => {
  try {
    const file = await FileModel.getFileById(req.params.id, req.user.id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', file.filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Physical file not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Delete file
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await FileModel.deleteFile(req.params.id, req.user.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Rename file
router.patch('/:id/rename', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'New name is required' });
    }

    const file = await FileModel.renameFile(req.params.id, req.user.id, name);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ message: 'File renamed successfully', file });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename file' });
  }
});

// Get file info
router.get('/:id', auth, async (req, res) => {
  try {
    const file = await FileModel.getFileById(req.params.id, req.user.id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

module.exports = router;
