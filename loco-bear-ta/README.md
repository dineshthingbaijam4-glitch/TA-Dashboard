# 🐻 Loco Bear — TA Operations Dashboard

A live talent acquisition tracking dashboard for Loco Bear HR team.

## 🚀 Deploy to Vercel (5 minutes)

### Option A — GitHub + Vercel (Recommended)
1. Create a free account at [github.com](https://github.com)
2. Create a new repository called `loco-bear-ta`
3. Upload all these files to the repository
4. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
5. Click **"Add New Project"** → Import your `loco-bear-ta` repo
6. Click **Deploy** — that's it! 🎉
7. You'll get a URL like `loco-bear-ta.vercel.app`

### Option B — Vercel CLI
```bash
npm install -g vercel
cd loco-bear-ta
vercel
```

## 🛠 Run Locally
```bash
npm install
npm start
```
Opens at http://localhost:3000

## 📋 Features
- **Dashboard** — Live stats, today's interviews, compliance snapshot, pipeline view
- **Open Positions** — All roles with step progress, filter by status
- **Compliance** — Centre HR tracker update status with reminder buttons
- **Interviews** — Today's interview schedule with join links
- **Alerts** — Overdue flags and notifications

## 🔌 Next Steps (connect real data)
1. Connect Google Sheets API to replace mock data in `src/App.js`
2. Connect Gmail API for sending reminders
3. Connect Fathom API for meeting transcripts
4. Set up daily email digest via Claude

## 📁 Project Structure
```
loco-bear-ta/
├── public/
│   └── index.html
├── src/
│   ├── index.js
│   └── App.js        ← Main dashboard (edit mock data here)
├── package.json
├── vercel.json
└── README.md
```
