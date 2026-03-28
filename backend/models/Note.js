const { v4: uuidv4 } = require('uuid');

class Note {
  constructor() {
    this.notes = [];
  }

  async createNote(noteData) {
    const note = {
      id: uuidv4(),
      ...noteData,
      done: false,
      reminderSent: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.notes.push(note);
    return note;
  }

  async getNotesByUserId(userId) {
    return this.notes
      .filter(note => note.userId === userId)
      .sort((a, b) => {
        const aTime = new Date(a.startAt || a.createdAt).getTime();
        const bTime = new Date(b.startAt || b.createdAt).getTime();
        return aTime - bTime;
      });
  }

  async getNoteById(id, userId) {
    return this.notes.find(note => note.id === id && note.userId === userId);
  }

  async updateNote(id, userId, updateData) {
    const note = await this.getNoteById(id, userId);
    if (!note) {
      return null;
    }

    Object.assign(note, updateData, { updatedAt: new Date() });
    return note;
  }

  async deleteNote(id, userId) {
    const index = this.notes.findIndex(note => note.id === id && note.userId === userId);
    if (index === -1) {
      return false;
    }

    this.notes.splice(index, 1);
    return true;
  }
}

module.exports = new Note();