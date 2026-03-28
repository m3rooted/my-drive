const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');

class File {
  constructor() {
    this.files = [];
    this.folders = [];
  }

  async createFile(fileData) {
    const file = {
      id: uuidv4(),
      ...fileData,
      sharedWith: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.files.push(file);
    return file;
  }

  async createFolder(folderData) {
    const folder = {
      id: uuidv4(),
      ...folderData,
      type: 'folder',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.folders.push(folder);
    return folder;
  }

  async getFilesByUserId(userId, folderId = null) {
    return this.files.filter(file => 
      file.userId === userId && file.folderId === folderId
    );
  }

  async getFoldersByUserId(userId, parentId = null) {
    return this.folders.filter(folder => 
      folder.userId === userId && folder.parentId === parentId
    );
  }

  async getFileById(id, userId) {
    return this.files.find(file => file.id === id && file.userId === userId);
  }

  async getFileByIdForUser(id, userId) {
    return this.files.find((file) => {
      if (file.id !== id) {
        return false;
      }

      if (file.userId === userId) {
        return true;
      }

      return (file.sharedWith || []).some((share) => share.userId === userId);
    });
  }

  async getSharedFilesForUser(userId) {
    return this.files.filter((file) =>
      (file.sharedWith || []).some((share) => share.userId === userId)
    );
  }

  async getShareEntry(file, userId) {
    return (file.sharedWith || []).find((share) => share.userId === userId) || null;
  }

  async shareFile(id, ownerId, shareUser, permission) {
    const file = await this.getFileById(id, ownerId);
    if (!file) {
      return null;
    }

    const existingShare = (file.sharedWith || []).find((share) => share.userId === shareUser.id);
    if (existingShare) {
      existingShare.permission = permission;
      existingShare.email = shareUser.email;
      existingShare.updatedAt = new Date();
    } else {
      file.sharedWith.push({
        userId: shareUser.id,
        email: shareUser.email,
        permission,
        sharedAt: new Date(),
        updatedAt: new Date()
      });
    }

    file.updatedAt = new Date();
    return file;
  }

  async removeShare(id, ownerId, sharedUserId) {
    const file = await this.getFileById(id, ownerId);
    if (!file) {
      return null;
    }

    const previousLength = file.sharedWith.length;
    file.sharedWith = file.sharedWith.filter((share) => share.userId !== sharedUserId);

    if (file.sharedWith.length === previousLength) {
      return false;
    }

    file.updatedAt = new Date();
    return true;
  }

  async canEditFile(id, userId) {
    const file = await this.getFileByIdForUser(id, userId);
    if (!file) {
      return false;
    }

    if (file.userId === userId) {
      return true;
    }

    const share = await this.getShareEntry(file, userId);
    return share?.permission === 'editor';
  }

  async getFolderById(id, userId) {
    return this.folders.find(folder => folder.id === id && folder.userId === userId);
  }

  async deleteFile(id, userId) {
    const fileIndex = this.files.findIndex(file => file.id === id && file.userId === userId);
    if (fileIndex > -1) {
      const file = this.files[fileIndex];
      
      // Delete physical file
      const filePath = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', file.filename);
      try {
        await fs.remove(filePath);
      } catch (error) {
        console.error('Error deleting physical file:', error);
      }
      
      this.files.splice(fileIndex, 1);
      return true;
    }
    return false;
  }

  async deleteFolder(id, userId) {
    const folderIndex = this.folders.findIndex(folder => folder.id === id && folder.userId === userId);
    if (folderIndex > -1) {
      // TODO: Add recursive deletion of contents
      this.folders.splice(folderIndex, 1);
      return true;
    }
    return false;
  }

  async renameFile(id, userId, newName) {
    const file = this.files.find(file => file.id === id && file.userId === userId);
    if (file) {
      file.originalName = newName;
      file.updatedAt = new Date();
      return file;
    }
    return null;
  }

  async renameFileByAccess(id, userId, newName) {
    const editable = await this.canEditFile(id, userId);
    if (!editable) {
      return null;
    }

    const file = await this.getFileByIdForUser(id, userId);
    if (!file) {
      return null;
    }

    file.originalName = newName;
    file.updatedAt = new Date();
    return file;
  }

  async renameFolder(id, userId, newName) {
    const folder = this.folders.find(folder => folder.id === id && folder.userId === userId);
    if (folder) {
      folder.name = newName;
      folder.updatedAt = new Date();
      return folder;
    }
    return null;
  }
}

module.exports = new File();
