# बिहार STET 2026 पेपर 2 (मनोविज्ञान) सिलेबस & वेटेज ट्रैकर
### Bihar STET 2026 Paper 2 Psychology Tracker with Vercel Serverless Backend & Cloud Sync

A production-ready, full-stack syllabus tracker for **Bihar STET 2026 (Higher Secondary / Senior Secondary Class 11-12)** with serverless backend APIs, offline-first localStorage backup, multi-device cloud synchronization, and 1-click deployment on **Vercel**.

---

## 🌟 Key Features

1. **Complete 150-Mark Syllabus & PYQ Weightage Tracker**:
   - **Part 1: Psychology (100 Marks / 15 Units)**: Detailed topics, PYQ focus, and priority tiers (High Yield, Medium, Standard).
   - **Part 2 (A): Art of Teaching (30 Marks / 6 Topics)**: Child-centered education, CCE, lesson planning, and teaching strategies.
   - **Part 2 (B): Other Skills (20 Marks / 4 Areas)**: Bihar GK, Environmental Science, Math & Reasoning.
2. **Serverless Backend (Vercel Ready)**:
   - `/api/auth/register`: Create a student account.
   - `/api/auth/login`: Authenticate and receive a secure JWT token.
   - `/api/auth/me`: Verify session across browser reloads.
   - `/api/progress`: Save and fetch syllabus progress, topic notes, revision counters, and confidence stars.
   - `/api/health`: Real-time health check and database status diagnostic.
3. **Multi-Device Cloud Sync**:
   - Work on your laptop, review notes on your mobile phone, and revise on your tablet.
   - Debounced automatic sync (1.5s after topic changes).
   - Instant manual sync button with last synced timestamp.
4. **Offline-First Resilience**:
   - Transparent fallback to browser `localStorage` if offline or if no cloud database is connected.
   - Zero barriers: You can start using the tracker immediately without setting up a database!
5. **Study Focus Pomodoro & Stopwatch Widget**:
   - 25m Focus, 50m Deep Work, 5m Break, and Stopwatch modes.
6. **Rich Topic Utilities**:
   - 1-Click YouTube lecture search for every single unit and topic.
   - Confidence stars (1-5), revision counter (+ / -), and dedicated notes drawer per topic.
   - JSON export and import for local backups.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js v18 or later (`node -v`)
- npm (`npm -v`)

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser and visit:
👉 **`http://localhost:3005`**

Health check endpoint:
👉 **`http://localhost:3005/api/health`**

---

## ☁️ Deploying to Vercel (Step-by-Step)

### Step 1: Set up Free MongoDB Atlas Database (Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up for free.
2. Click **Create a Deployment** and select the **M0 Free** cluster (512 MB forever free).
3. Under **Security > Database Access**, add a database user with username and password.
4. Under **Security > Network Access**, click **Add IP Address** and select **Allow Access from Anywhere (`0.0.0.0/0`)** (required for Vercel serverless functions).
5. Click **Connect > Drivers**, select **Node.js**, and copy the connection string. It will look like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/stet_tracker?retryWrites=true&w=majority
   ```

### Step 2: Deploy to Vercel

#### Method A: Via GitHub (Recommended)
1. Initialize a git repository and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Bihar STET 2026 Tracker with Vercel Backend"
   git branch -M main
   # Push to your GitHub repository:
   git remote add origin https://github.com/<your-username>/stet-2-tracker.git
   git push -u origin main
   ```
2. Go to [Vercel](https://vercel.com) and click **"Add New" > "Project"**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string from Step 1.
   - `JWT_SECRET`: A secure random string (e.g. `stet_2026_super_secure_key_12345`).
5. Click **Deploy**! 🚀
   Vercel will build and deploy your application in under 30 seconds with a free `.vercel.app` domain.

#### Method B: Via Vercel CLI
```bash
npx vercel
```
Follow the prompts, and when prompted for Environment Variables, add `MONGODB_URI` and `JWT_SECRET`.

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Local server port | `3005` |
| `JWT_SECRET` | Secret key for JWT signing | `stet_2026_super_secret_jwt_key` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster...` |

*(Note: If `MONGODB_URI` is omitted, the backend automatically operates in Local Fallback mode).*

---

## 📁 Project Structure

```
STET-2 TRACKER/
├── api/                     # Vercel Serverless Functions
│   ├── auth/
│   │   ├── register.js      # Student account registration
│   │   ├── login.js         # Student login & JWT issuance
│   │   └── me.js            # Session verification endpoint
│   ├── progress.js          # Syllabus progress GET & POST handler
│   └── health.js            # Server health & DB diagnostic
├── lib/                     # Shared Server Utilities
│   ├── db.js                # Serverless MongoDB connection pooling & fallback
│   └── auth.js              # Password hashing & JWT middleware
├── index.html               # Main Web Tracker App with Cloud Sync & Auth UI
├── server.js                # Local Express development server
├── vercel.json              # Vercel serverless routing & CORS configuration
├── package.json             # Project metadata & dependencies
├── .env.example             # Sample environment variables
└── README.md                # Deployment and usage documentation
```

---

## 📝 License
MIT License. Built for Bihar STET aspirants.
