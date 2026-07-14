# Fluxora 🚀
### The AI-Driven Career Catalyst & DevLaunch Incubator

Fluxora is an elite, full-stack career acceleration and project collaboration platform. It bridges the gap between talented developers and startups through AI-powered mentoring, automated resume/ATS optimization, and a milestone-based project incubator (DevLaunch).

---

## 🎨 Working Platform Showcase

### 1. Interactive Landing Page
Vibrant styling, responsive project discovery grids, and custom modern typography.
![Landing Page](https://raw.githubusercontent.com/Abhishek1106kr/Client-fluxora/main/src/assets/mainpage_screenshot.png)

### 2. Candidate Dashboard & Levitating AI Career Coach (Fluxy)
A dark-mode dashboard showcasing developer stats, credentials, and a floating, levitating AI Coach (Fluxy) with direct resume PDF upload + profile parsing triggers.
![Candidate Dashboard](https://raw.githubusercontent.com/Abhishek1106kr/Client-fluxora/main/src/assets/dashboard_screenshot.png)

### 3. AI Resume Analyzer & ATS Score Optimizer
Specifies target career goals, calculates semantic keyword match scores, lists critical gaps, and provides step-by-step fixes to bypass applicant tracking filters.
![AI Resume Optimizer](https://raw.githubusercontent.com/Abhishek1106kr/Client-fluxora/main/src/assets/resume_prep_screenshot.png)

---

## 🧠 Key Architecture Modules

1. **AI Career Coach Chatbot (Fluxy)**:
   - Floating chat interface with levitating robot CSS keyframe translations.
   - Built-in paperclip uploader: Uploads resume PDFs, automatically triggers the backend text-parser, and updates candidate profiles in MongoDB.
   - Performs semantic vector matching against database jobs to recommend careers.
2. **AI Resume Optimizer**:
   - Compares parsed resume context against target job descriptions.
   - Outputs compatibility scores, technical keyword gaps, and actionable improvements.
3. **DevLaunch Marketplace**:
   - A collaborative workspace for developers and startups.
   - Milestone tracking dashboards with auto-recalculated project completion percentages.
4. **Multi-Container Docker Configuration**:
   - Production-ready `docker-compose.yml` orchestrating React (Nginx reverse proxy) and Node.js backend.

---

## 🛠️ Core Technology Stack

* **Frontend**: React 19 (Vite), TailwindCSS, Lucide Icons, Framer Motion
* **Backend**: Node.js, Express, Mongoose (MongoDB Atlas)
* **ORM & Database**: Prisma Client (PostgreSQL / Accelerate)
* **AI Engine**: Groq SDK (Llama completions & semantic matching)
* **Containerization**: Docker, Nginx, Docker Compose

---

## 🚀 Quick Local Setup

### Running with Docker Compose (Recommended)
Free ports `5173` and `5002` on your machine and launch the containerized application:
```bash
docker compose up --build -d
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5002`

---

### Manual Setup (Development Mode)

#### 1. Server Configuration
```bash
cd server
npm install
npx prisma generate
```
Create `server/.env`:
```env
MONGODB_URL=your_mongodb_connection_uri
DATABASE_URL=your_postgres_prisma_uri
JWT_SECRET=your_jwt_signing_key
GROQ_API_KEY=your_groq_llama_api_key
PORT=5002
```
Start the local server:
```bash
npm run dev
```

#### 2. Frontend Configuration
```bash
cd frontend
npm install --legacy-peer-deps
```
Create `frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:5002
```
Start the Vite server:
```bash
npm run dev
```

---

## 👨‍💻 Contributors
- **Abhishek Kumar Chauhan**
- **Aamir Khan**
- **Devansh Verma**
- (And other awesome team members 🚀)
