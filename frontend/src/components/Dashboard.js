import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { filesAPI, foldersAPI, notesAPI } from '../services/api';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import {
  HardDrive,
  LogOut,
  Upload,
  FolderPlus,
  File,
  Folder,
  Download,
  Trash2,
  Search,
  Grid,
  List,
  CalendarDays,
  CheckCircle2,
  Circle
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeTab, setActiveTab] = useState('drive');

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [newScheduleContent, setNewScheduleContent] = useState('');
  const [newScheduleStartAt, setNewScheduleStartAt] = useState('');
  const [newScheduleEndAt, setNewScheduleEndAt] = useState('');
  const [scheduleSortOrder, setScheduleSortOrder] = useState('asc');
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await filesAPI.getFiles(currentFolder);
      setFiles(response.data.files);
      setFolders(response.data.folders);
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [currentFolder]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const response = await notesAPI.getNotes();
      setNotes(response.data.notes || []);
    } catch (error) {
      toast.error('Failed to load notes');
    } finally {
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeTab === 'notes') {
      loadNotes();
    }
  }, [activeTab, loadNotes]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    const eventSource = new EventSource(notesAPI.getNotesStreamUrl(token));

    eventSource.addEventListener('notes:update', (event) => {
      try {
        const payload = JSON.parse(event.data);
        setNotes(payload.notes || []);
      } catch (error) {
        // Ignore malformed stream events and continue listening.
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
      setTimeout(() => {
        if (activeTab === 'notes') {
          loadNotes();
        }
      }, 1000);
    };

    return () => {
      eventSource.close();
    };
  }, [activeTab, loadNotes]);

  const onDrop = async (acceptedFiles) => {
    setUploading(true);
    
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolder) {
        formData.append('folderId', currentFolder);
      }

      try {
        await filesAPI.uploadFile(formData);
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setUploading(false);
    loadFiles();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const handleDownload = async (file) => {
    try {
      const response = await filesAPI.downloadFile(file.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await filesAPI.deleteFile(fileId);
        toast.success('File deleted successfully');
        loadFiles();
      } catch (error) {
        toast.error('Failed to delete file');
      }
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (window.confirm('Are you sure you want to delete this folder?')) {
      try {
        await foldersAPI.deleteFolder(folderId);
        toast.success('Folder deleted successfully');
        loadFiles();
      } catch (error) {
        toast.error('Failed to delete folder');
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      await foldersAPI.createFolder({
        name: newFolderName,
        parentId: currentFolder
      });
      toast.success('Folder created successfully');
      setNewFolderName('');
      setShowNewFolderModal(false);
      loadFiles();
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) {
      toast.error('Please enter a note title');
      return;
    }

    try {
      await notesAPI.createNote({
        title: newNoteTitle,
        content: newNoteContent,
        category: 'note',
        startAt: new Date().toISOString(),
        endAt: null
      });

      toast.success('Note added successfully');
      setNewNoteTitle('');
      setNewNoteContent('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add note');
    }
  };

  const handleCreateSchedule = async () => {
    if (!newScheduleTitle.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    if (!newScheduleStartAt) {
      toast.error('Please select a start time');
      return;
    }

    try {
      await notesAPI.createNote({
        title: newScheduleTitle,
        content: newScheduleContent,
        category: 'schedule',
        startAt: new Date(newScheduleStartAt).toISOString(),
        endAt: newScheduleEndAt ? new Date(newScheduleEndAt).toISOString() : null
      });

      toast.success('Event added successfully');
      setNewScheduleTitle('');
      setNewScheduleContent('');
      setNewScheduleStartAt('');
      setNewScheduleEndAt('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add event');
    }
  };

  const handleToggleNoteDone = async (note) => {
    try {
      await notesAPI.updateNote(note.id, { done: !note.done });
      toast.success(note.done ? 'Marked as pending' : 'Marked as done');
    } catch (error) {
      toast.error('Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await notesAPI.deleteNote(noteId);
      toast.success('Note deleted successfully');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCountdown = (targetDate) => {
    const diff = new Date(targetDate).getTime() - currentTime.getTime();
    if (diff <= 0) {
      return 'Now';
    }

    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `in ${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    }
    return `in ${minutes}m`;
  };

  const getNoteStatus = (note) => {
    if (note.done) {
      return { label: 'Completed', style: 'bg-green-100 text-green-700' };
    }

    const start = new Date(note.startAt).getTime();
    const end = note.endAt ? new Date(note.endAt).getTime() : null;
    const now = currentTime.getTime();

    if (now < start) {
      return {
        label: `Upcoming ${formatCountdown(note.startAt)}`,
        style: 'bg-blue-100 text-blue-700'
      };
    }

    if (end && now > end) {
      return { label: 'Overdue', style: 'bg-red-100 text-red-700' };
    }

    return { label: 'In Progress', style: 'bg-amber-100 text-amber-700' };
  };

  const filteredFiles = files.filter(file =>
    file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNotes = notes.filter(note => {
    const keyword = searchTerm.toLowerCase();
    return note.title.toLowerCase().includes(keyword) || note.content.toLowerCase().includes(keyword);
  });

  const notesOnly = filteredNotes.filter((note) => (note.category || 'schedule') === 'note');
  const scheduleOnly = filteredNotes
    .filter((note) => (note.category || 'schedule') === 'schedule')
    .sort((a, b) => {
      const aTime = new Date(a.startAt).getTime();
      const bTime = new Date(b.startAt).getTime();
      return scheduleSortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <HardDrive className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Drive Clone</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder={activeTab === 'drive' ? 'Search files...' : 'Search notes...'}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {activeTab === 'drive' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="p-2 text-gray-600 hover:text-gray-900"
                  >
                    {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
                  </button>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Welcome, {user?.name}</span>
                <button
                  onClick={logout}
                  className="text-red-600 hover:text-red-700 flex items-center"
                >
                  <LogOut size={16} className="ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-4">
            <button
              onClick={() => setActiveTab('drive')}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
                activeTab === 'drive' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HardDrive size={18} className="mr-2" />
              Drive
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
                activeTab === 'notes' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CalendarDays size={18} className="mr-2" />
              Notes & Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'drive' && (
          <>
            {/* Toolbar */}
            <div className="mb-6 flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <FolderPlus size={20} className="mr-2" />
                  New Folder
                </button>

                <div {...getRootProps()} className="cursor-pointer">
                  <input {...getInputProps()} />
                  <button
                    disabled={uploading}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Upload size={20} className="mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Files'}
                  </button>
                </div>
              </div>
            </div>

            {/* Drop Zone */}
            {isDragActive && (
              <div className="fixed inset-0 bg-blue-500 bg-opacity-20 border-4 border-dashed border-blue-500 flex items-center justify-center z-50">
                <div className="text-2xl font-bold text-blue-700">
                  Drop files here to upload
                </div>
              </div>
            )}

            {/* Files Grid/List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' : 'space-y-2'}>
                {/* Folders */}
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer ${
                      viewMode === 'list' ? 'flex items-center p-3' : 'p-4'
                    }`}
                    onClick={() => setCurrentFolder(folder.id)}
                  >
                    <div className="flex items-center">
                      <Folder className="h-8 w-8 text-blue-500 mr-3" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {folder.name}
                        </p>
                        {viewMode === 'list' && (
                          <p className="text-xs text-gray-500">
                            {formatDate(folder.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Files */}
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
                      viewMode === 'list' ? 'flex items-center p-3' : 'p-4'
                    }`}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <File className="h-8 w-8 text-gray-500 mr-3" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.originalName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                          {viewMode === 'list' && ` • ${formatDate(file.createdAt)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredFiles.length === 0 && filteredFolders.length === 0 && (
              <div className="text-center py-12">
                <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No files yet</h3>
                <p className="text-gray-500 mb-4">Upload your first file to get started</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'notes' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <File className="h-6 w-6 text-blue-600 mr-2" />
                  <h2 className="text-3xl font-semibold text-gray-900">Notes</h2>
                </div>

                <input
                  type="text"
                  placeholder="Note title"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full px-4 py-3 mb-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <textarea
                  rows={5}
                  placeholder="Content"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <button
                  onClick={handleCreateNote}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                  Add Note
                </button>

                <div className="mt-6 space-y-3">
                  {notesLoading ? (
                    <p className="text-gray-500">Loading...</p>
                  ) : notesOnly.length === 0 ? (
                    <p className="text-gray-500">No notes yet.</p>
                  ) : (
                    notesOnly.map((note) => (
                      <div key={note.id} className="border border-gray-200 rounded-xl p-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 pr-3">
                            <h3 className={`font-medium ${note.done ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {note.title}
                            </h3>
                            {note.content && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{note.content}</p>}
                            <p className="text-xs text-gray-500 mt-2">Updated: {formatDate(note.updatedAt)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleNoteDone(note)}
                              className="text-gray-500 hover:text-green-600"
                            >
                              {note.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CalendarDays className="h-6 w-6 text-green-600 mr-2" />
                    <h2 className="text-3xl font-semibold text-gray-900">Schedule</h2>
                  </div>
                  <select
                    className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700"
                    value={scheduleSortOrder}
                    onChange={(e) => setScheduleSortOrder(e.target.value)}
                  >
                    <option value="asc">Soon to late</option>
                    <option value="desc">Late to soon</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Task title"
                  value={newScheduleTitle}
                  onChange={(e) => setNewScheduleTitle(e.target.value)}
                  className="w-full px-4 py-3 mb-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />

                <textarea
                  rows={4}
                  placeholder="Description (optional)"
                  value={newScheduleContent}
                  onChange={(e) => setNewScheduleContent(e.target.value)}
                  className="w-full px-4 py-3 mb-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <input
                    type="datetime-local"
                    value={newScheduleStartAt}
                    onChange={(e) => setNewScheduleStartAt(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="datetime-local"
                    value={newScheduleEndAt}
                    onChange={(e) => setNewScheduleEndAt(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleCreateSchedule}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700"
                >
                  Add Event
                </button>

                <div className="mt-6 space-y-3">
                  {notesLoading ? (
                    <p className="text-gray-500">Loading...</p>
                  ) : scheduleOnly.length === 0 ? (
                    <p className="text-gray-500">No events yet.</p>
                  ) : (
                    scheduleOnly.map((note) => {
                      const status = getNoteStatus(note);
                      return (
                        <div key={note.id} className="border border-gray-200 rounded-xl p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleNoteDone(note)}
                                  className="text-gray-500 hover:text-green-600"
                                >
                                  {note.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </button>
                                <h3 className={`font-medium ${note.done ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {note.title}
                                </h3>
                              </div>
                              {note.content && <p className="text-sm text-gray-600 mt-1">{note.content}</p>}
                              <p className="text-xs text-gray-500 mt-2">Start: {formatDate(note.startAt)}</p>
                              {note.endAt && <p className="text-xs text-gray-500">End: {formatDate(note.endAt)}</p>}
                              <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${status.style}`}>
                                {status.label}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                }
              }}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
