# Google Drive Clone - Backend

A RESTful API server built with Node.js and Express for file storage and management.

## Features

- **User Authentication**: Register, login, and JWT-based authentication
- **File Upload**: Multi-file upload with drag and drop support
- **File Management**: View, download, delete, and rename files
- **Folder Management**: Create, delete, and organize files in folders
- **Security**: JWT tokens, password hashing, and user isolation
- **File Storage**: Local file storage with unique naming
- **Email Reminders**: Gmail notifications before schedule due time

## Tech Stack

- Node.js
- Express.js
- Multer (file uploads)
- bcryptjs (password hashing)
- jsonwebtoken (authentication)
- fs-extra (file system operations)
- cors (cross-origin requests)

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the backend directory:
```env
PORT=5000
JWT_SECRET=your-secret-key-here-please-change-this
UPLOAD_DIR=uploads
NODE_ENV=development
REMINDER_MINUTES_BEFORE=10
MAIL_SERVICE=gmail
MAIL_USER=your-email@gmail.com
MAIL_APP_PASSWORD=your-gmail-app-password
MAIL_FROM=Drive Clone <your-email@gmail.com>
```

For Gmail, create an App Password in your Google account security settings and use it in `MAIL_APP_PASSWORD`.

4. Start the development server:
```bash
npm run dev
```

Or for production:
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Files
- `GET /api/files` - Get files and folders (with optional folderId query)
- `GET /api/files/shared` - Get files shared with current user
- `POST /api/files/upload` - Upload a file
- `GET /api/files/download/:id` - Download a file
- `DELETE /api/files/:id` - Delete a file
- `PATCH /api/files/:id/rename` - Rename a file
- `POST /api/files/:id/share` - Share a file with another user by email (`viewer` or `editor`)
- `DELETE /api/files/:id/share/:sharedUserId` - Remove shared access for a user
- `GET /api/files/:id` - Get file info

### Folders
- `POST /api/folders` - Create a folder
- `GET /api/folders/:id` - Get folder contents
- `DELETE /api/folders/:id` - Delete a folder
- `PATCH /api/folders/:id/rename` - Rename a folder

## Data Storage

This application uses in-memory storage for simplicity. In a production environment, you should replace this with a proper database like MongoDB or PostgreSQL.

## File Structure

```
backend/
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── User.js              # User model (in-memory)
│   └── File.js              # File/Folder model (in-memory)
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── files.js             # File management routes
│   └── folders.js           # Folder management routes
├── uploads/                 # File storage directory (created automatically)
├── .env                     # Environment variables
├── package.json             # Dependencies and scripts
└── server.js               # Main server file
```

## Security Considerations

- JWT tokens expire in 7 days
- Passwords are hashed using bcrypt
- Users can only access their own files
- File uploads are limited to 100MB
- CORS is enabled for frontend integration

## Development

For development, use:
```bash
npm run dev
```

This uses nodemon for automatic server restart on file changes.
