# Nirvaana Wellness - Spa Operations ERP

A secure, scalable, mobile-first internal operations management application for spa operations.

## Tech Stack

### Frontend
- React 19
- Tailwind CSS 3
- shadcn/ui components
- Recharts (analytics)
- Axios (API calls)

### Backend
- Python 3.11
- FastAPI
- Motor (async MongoDB)
- Pydantic 2
- NumPy (forecasting)

### Database
- MongoDB

### Integrations
- Resend (transactional emails)

## Features
- Property & Therapist Management
- Attendance Tracking
- Service Entry with GST (18%)
- Revenue Analytics & Forecasting
- Customer Directory with Excel Export
- Automated Email Feedback
- Secure OTP-based Password Reset

## Deployment

### Prerequisites
- MongoDB Atlas account (free tier)
- Resend account for emails
- Render account (backend hosting)
- Vercel account (frontend hosting)

### Backend Deployment (Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set root directory to `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Add environment variables (see below)

### Frontend Deployment (Vercel)
1. Import repository on Vercel
2. Set root directory to `frontend`
3. Framework preset: Create React App
4. Add `REACT_APP_BACKEND_URL` environment variable

### Environment Variables

**Backend (.env)**
```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=nirvaana_db
JWT_SECRET=your-secure-jwt-secret
RESEND_API_KEY=re_your_api_key
EMAIL_ENABLED=true
EMAIL_PROVIDER=resend
FROM_EMAIL=Nirvaana Wellness <noreply@yourdomain.com>
```

**Frontend (.env)**
```
REACT_APP_BACKEND_URL=https://your-backend-url.onrender.com
```

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install
yarn start
```

## Default Admin Credentials
- Username: `admin`
- Password: `admin123`

## License
Proprietary - Nirvaana Wellness
