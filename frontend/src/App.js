import React, { useState, useEffect } from 'react';
import axios from 'axios';

// API configuration
const API_URL = 'http://localhost:8000/api';

// Auth token management
const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

const App = () => {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Notes state
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState({ title: '', content: '' });
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  
  // Categories state
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // UI state
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check for existing token on load
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setAuthToken(token);
      setIsLoggedIn(true);
      fetchNotes();
      fetchCategories();
    }
  }, []);

  // Fetch notes from API
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/notes`, {
        params: { archived: showArchived }
      });
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
    setLoading(false);
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const response = await axios.post(`${API_URL}/login`, {
        username: loginUsername,
        password: loginPassword
      });
      const { access_token, username: userName } = response.data;
      localStorage.setItem('access_token', access_token);
      setAuthToken(access_token);
      setIsLoggedIn(true);
      setUsername(userName);
      setLoginUsername('');
      setLoginPassword('');
      fetchNotes();
      fetchCategories();
    } catch (error) {
      setAuthError(error.response?.data?.detail || 'Login failed');
    }
  };

  // Handle register
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const response = await axios.post(`${API_URL}/register`, {
        username: registerUsername,
        email: registerEmail,
        password: registerPassword
      });
      const { access_token, username: userName } = response.data;
      localStorage.setItem('access_token', access_token);
      setAuthToken(access_token);
      setIsLoggedIn(true);
      setUsername(userName);
      setRegisterUsername('');
      setRegisterEmail('');
      setRegisterPassword('');
      fetchNotes();
      fetchCategories();
    } catch (error) {
      setAuthError(error.response?.data?.detail || 'Registration failed');
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setAuthToken(null);
    setIsLoggedIn(false);
    setUsername('');
    setNotes([]);
  };

  // Save or update note
  const saveNote = async () => {
    if (!currentNote.title.trim()) {
      alert('Please enter a title');
      return;
    }

    setLoading(true);
    try {
      if (editingNoteId) {
        await axios.put(`${API_URL}/notes/${editingNoteId}`, {
          title: currentNote.title,
          content: currentNote.content,
          category_id: selectedCategory
        });
      } else {
        await axios.post(`${API_URL}/notes`, {
          title: currentNote.title,
          content: currentNote.content,
          category_id: selectedCategory,
          tags: []
        });
      }
      setCurrentNote({ title: '', content: '' });
      setEditingNoteId(null);
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
    }
    setLoading(false);
  };

  // Delete note
  const deleteNote = async (noteId) => {
    if (window.confirm('Delete this note?')) {
      try {
        await axios.delete(`${API_URL}/notes/${noteId}`);
        fetchNotes();
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  // Edit note
  const editNote = (note) => {
    setCurrentNote({ title: note.title, content: note.content });
    setEditingNoteId(note.id);
    setSelectedCategory(note.category_id);
  };

  // Create category
  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await axios.post(`${API_URL}/categories`, { name: newCategoryName });
      setNewCategoryName('');
      setShowCategoryModal(false);
      fetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  // Toggle archive
  const toggleArchive = async (noteId, archived) => {
    try {
      await axios.put(`${API_URL}/notes/${noteId}`, { is_archived: !archived });
      fetchNotes();
    } catch (error) {
      console.error('Error archiving note:', error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">📝 NoteApp</h1>
            <p className="text-gray-600 mt-2">Your personal note-taking workspace</p>
          </div>

          {authError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {authError}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-xl font-semibold">Login</h2>
            <input
              type="text"
              placeholder="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Login
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          {/* Register Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <h2 className="text-xl font-semibold">Create Account</h2>
            <input
              type="text"
              placeholder="Username"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
            >
              Register
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        {/* Navbar */}
        <nav className="bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-10">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  📝 {username}'s Notes
                </h1>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`px-3 py-1 rounded text-sm ${
                    showArchived 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {showArchived ? '📦 Archived' : 'Active'}
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="px-3 py-1 rounded bg-purple-500 text-white text-sm hover:bg-purple-600"
                >
                  + Category
                </button>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Note Editor */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {editingNoteId ? '✏️ Edit Note' : '📝 New Note'}
                </h2>
                {editingNoteId && (
                  <button
                    onClick={() => {
                      setCurrentNote({ title: '', content: '' });
                      setEditingNoteId(null);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              
              <input
                type="text"
                placeholder="Note title..."
                className="w-full text-xl font-semibold mb-4 p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={currentNote.title}
                onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
              />
              
              <textarea
                placeholder="Write your note content here..."
                className="w-full h-64 p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={currentNote.content}
                onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
              />
              
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={saveNote}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>

            {/* Notes List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4">
                {showArchived ? '📦 Archived Notes' : '📋 Recent Notes'}
              </h2>
              
              {loading && notes.length === 0 ? (
                <div className="text-center text-gray-500 py-8">Loading...</div>
              ) : notes.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {showArchived ? 'No archived notes' : 'No notes yet. Create one!'}
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition group"
                    >
                      <div onClick={() => editNote(note)}>
                        <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                          {note.title || 'Untitled'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                          {note.content || 'No content'}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">
                            {new Date(note.created_at).toLocaleDateString()}
                          </span>
                          {note.category_name && (
                            <span 
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: note.category_color || '#3B82F6', color: 'white' }}
                            >
                              {note.category_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-2">
                        <button
                          onClick={() => toggleArchive(note.id, note.is_archived)}
                          className="text-xs text-gray-500 hover:text-yellow-600"
                        >
                          {note.is_archived ? '📤 Unarchive' : '📥 Archive'}
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Create Category</h2>
            <input
              type="text"
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={createCategory}
                className="px-4 py-2 bg-purple-500 text-white rounded"
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

export default App;
