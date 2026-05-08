# AnimeFlix — Anime Streaming & Tracking Platform

AnimeFlix is a modern web application for browsing, searching, and tracking anime series. Built with vanilla HTML/CSS/JavaScript and a Node.js backend, it provides a seamless experience for anime enthusiasts.

## Features

- 🎬 Browse trending, top-rated, and popular anime
- 🔍 Search anime by title and filter by genre
- ❤️ Save favorites to your personal collection
- 👤 User authentication with JWT
- 🌙 Dark/Light theme toggle
- 📱 Fully responsive design
- 🔄 Continue watching functionality
- 📊 Detailed anime information and recommendations

## Tech Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Netlify Functions for API proxy
- Jikan API (unofficial MyAnimeList API)

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT authentication
- bcryptjs for password hashing

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/anime-sayt.git
   cd anime-sayt
   ```

2. **Install frontend dependencies**
   ```bash
   # No frontend dependencies needed (vanilla JS)
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Environment Configuration**
   
   **Frontend (.env):**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```
   
   **Backend (.env):**
   ```bash
   cd backend
   cp .env.example .env
   # Edit backend/.env with your actual values:
   # - MONGO_URI: Your MongoDB connection string
   # - JWT_SECRET: A long random secret for JWT tokens
   # - FRONTEND_URLS: Comma-separated list of allowed frontend URLs
   ```

5. **Start the development servers**
   
   **Backend:**
   ```bash
   cd backend
   npm run dev
   # Server runs on http://localhost:5000
   ```
   
   **Frontend:**
   ```bash
   # From root directory
   node server.js
   # Frontend runs on http://localhost:8000
   ```

## Environment Variables

### Frontend (.env)
- `PORT`: Server port for local development (default: 8000)
- `AUTH_API_BASE_URL`: Backend API URL
- `ANIME_API_BASE_URL`: Anime API endpoint
- `NODE_ENV`: Environment (development/production)

### Backend (.env)
- `PORT`: Backend server port (default: 5000)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `JWT_EXPIRE`: JWT token expiration (default: 7d)
- `FRONTEND_URLS`: Comma-separated allowed frontend URLs
- `NODE_ENV`: Environment (development/production)

## Deployment

### Frontend (Netlify)
1. Connect your repository to Netlify
2. Set build command: `echo "No build needed"`
3. Set publish directory: `.`
4. Add environment variables in Netlify dashboard
5. Deploy Netlify Functions from `netlify/functions` directory

### Backend (Render/Railway)
1. Connect your repository to Render/Railway
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add all environment variables from `.env.example`
5. Deploy

## API Usage

The application uses the Jikan API for anime data:
- Base URL: `https://api.jikan.moe/v4`
- No API key required
- Rate limited: 3 requests per second

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security Notes

- ⚠️ Never commit `.env` files to version control
- ⚠️ Always use strong, unique JWT secrets
- ⚠️ Validate and sanitize all user inputs
- ⚠️ Use HTTPS in production
- ⚠️ Keep dependencies updated

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues:
1. Check the [Issues](https://github.com/your-username/anime-sayt/issues) page
2. Create a new issue with detailed information
3. Include steps to reproduce the problem

---

**Built with ❤️ for anime enthusiasts**
