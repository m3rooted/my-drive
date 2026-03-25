const express = require('express');
const auth = require('../middleware/auth');
const FileModel = require('../models/File');

const router = express.Router();

// Create folder
router.post('/', auth, async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folderData = {
      name,
      parentId: parentId || null,
      userId: req.user.id
    };

    const folder = await FileModel.createFolder(folderData);

    res.status(201).json({
      message: 'Folder created successfully',
      folder
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Get folder contents
router.get('/:id', auth, async (req, res) => {
  try {
    const folderId = req.params.id;
    
    const folder = await FileModel.getFolderById(folderId, req.user.id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const files = await FileModel.getFilesByUserId(req.user.id, folderId);
    const subfolders = await FileModel.getFoldersByUserId(req.user.id, folderId);

    res.json({
      folder,
      files,
      folders: subfolders
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get folder contents' });
  }
});

// Delete folder
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await FileModel.deleteFolder(req.params.id, req.user.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Rename folder
router.patch('/:id/rename', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'New name is required' });
    }

    const folder = await FileModel.renameFolder(req.params.id, req.user.id, name);
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({ message: 'Folder renamed successfully', folder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename folder' });
  }
});

module.exports = router;
