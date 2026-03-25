# 🚀 Google Drive Clone - Setup Guide

## Quick Start Commands

### 1. Clone the Repository
```bash
git clone https://github.com/m3rooted/my-drive
cd my-drive
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env file with your configurations
npm run dev
```

### 3. Frontend Setup (New Terminal)
```bash
cd frontend
npm install
npm start
```

### 4. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

## Environment Variables

Create a `.env` file in the backend directory with:
```env
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
UPLOAD_DIR=uploads
NODE_ENV=development
MAIL_SERVICE=gmail
MAIL_USER=your-gmail@gmail.com
MAIL_APP_PASSWORD=your-16-char-app-password
MAIL_FROM=Drive Clone <your-gmail@gmail.com>
REMINDER_MINUTES_BEFORE=10
```

### Gmail Reminder Setup

To receive schedule reminders by email:

1. Use the same Gmail account (or any Gmail account) in `MAIL_USER`
2. Enable 2-Step Verification on that Google account
3. Create an App Password in Google Account security settings
4. Put that 16-character value into `MAIL_APP_PASSWORD`
5. Restart backend after changing `.env`

## Features Included

✅ User Registration & Login
✅ JWT Authentication
✅ File Upload (Drag & Drop)
✅ File Download
✅ Folder Creation & Navigation
✅ File/Folder Deletion
✅ Search Functionality
✅ Responsive Design
✅ Real-time Notifications

## Tech Stack

### Frontend
- React 18
- Tailwind CSS
- React Router
- Axios
- React Dropzone
- Lucide Icons

### Backend
- Node.js
- Express.js
- Multer (File Upload)
- JWT Authentication
- bcryptjs (Password Hashing)

## Deployment

### Backend (Heroku/Railway/DigitalOcean)
1. Set environment variables
2. Deploy backend code
3. Update CORS settings if needed

### Frontend (Netlify/Vercel)
1. Build the project: `npm run build`
2. Deploy the `build` folder
3. Set `REACT_APP_API_URL` environment variable

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is open source and available under the MIT License.
