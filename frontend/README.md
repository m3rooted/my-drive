# Google Drive Clone - Frontend

A modern React web application that provides a Google Drive-like interface for file storage and management.

## Features

- **User Authentication**: Login and registration forms
- **File Upload**: Drag and drop file upload with progress feedback
- **File Management**: View, download, delete, and search files
- **Folder Management**: Create, navigate, and organize files in folders
- **Responsive Design**: Works on desktop and mobile devices
- **Grid/List Views**: Toggle between different file display modes
- **Real-time Feedback**: Toast notifications for user actions

## Tech Stack

- React 18
- React Router DOM (routing)
- Axios (HTTP client)
- Tailwind CSS (styling)
- Lucide React (icons)
- React Dropzone (file upload)
- React Hot Toast (notifications)

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`

## Environment Variables

Create a `.env` file in the frontend directory if you need to customize the API URL:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

By default, the app will connect to the backend at `http://localhost:5000/api` due to the proxy setting in package.json.

## Available Scripts

- `npm start` - Run the development server
- `npm run build` - Build the app for production
- `npm test` - Run the test suite
- `npm run eject` - Eject from Create React App (not recommended)

## File Structure

```
frontend/
├── public/
│   └── index.html           # HTML template
├── src/
│   ├── components/
│   │   ├── Dashboard.js     # Main dashboard component
│   │   ├── Login.js         # Login form component
│   │   ├── Register.js      # Registration form component
│   │   └── LoadingSpinner.js # Loading indicator
│   ├── contexts/
│   │   └── AuthContext.js   # Authentication context and hooks
│   ├── services/
│   │   └── api.js          # API service layer
│   ├── App.js              # Main app component with routing
│   ├── index.js            # React entry point
│   └── index.css           # Global styles with Tailwind
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind configuration
└── postcss.config.js       # PostCSS configuration
```

## Key Components

### Dashboard
The main interface for file management with:
- File and folder grid/list view
- Drag and drop upload
- Search functionality
- File operations (download, delete)
- Folder creation and navigation

### Authentication
- Login and registration forms
- JWT token management
- Protected route handling
- User session persistence

### API Integration
- Axios interceptors for authentication
- Automatic token attachment
- Error handling and user feedback
- File upload with progress tracking

## Styling

The app uses Tailwind CSS for styling with:
- Responsive design patterns
- Modern UI components
- Consistent color scheme
- Hover and focus states
- Loading and disabled states

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

For development, the app includes:
- Hot reloading
- Error overlays
- Development proxy to backend
- Component debugging tools

## Building for Production

To build the app for production:

```bash
npm run build
```

This creates an optimized build in the `build` folder ready for deployment.

## Deployment

The built app can be deployed to any static hosting service like:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Apache/Nginx server

Make sure to update the API URL environment variable for production deployment.
