# 🏏 CreaseControl – IPL Analytics Platform

A modern full-stack IPL analytics platform built using **Flask, React, and MySQL**, designed to explore IPL data from **2008–2025** through interactive dashboards, player insights, team analysis, match details, and season evolution.

CreaseControl combines data engineering, backend APIs, and responsive frontend design to transform raw ball-by-ball IPL data into meaningful cricket intelligence.

---

## ✨ Features

### 📊 Dashboard
- IPL overview and key statistics
- Total matches, runs, wickets, sixes
- Quick navigation to players, teams, matches, and seasons

### 👤 Player Analytics
- Career and season-wise statistics
- Batting KPIs:
  - Runs
  - Average
  - Strike Rate
  - 50s / 100s
  - Highest Score
- Bowling KPIs:
  - Wickets
  - Economy
  - Average
- Phase-wise performance analysis
- Teams played for
- Fielding statistics

### 🛡 Team Analytics
- Team records and history
- Wins and losses
- Season performance
- Team-based navigation

### 🏏 Match Explorer
- Search matches by team
- Filter by season
- Match details:
  - Venue
  - Toss
  - Winner
  - Margin
  - Player of the Match
- Responsive match cards

### 📅 Season Analytics
- Season snapshot
- Champion & Runner-up
- Player of Tournament
- Total runs, wickets, sixes
- Phase analysis
- Orange Cap leaderboard
- Purple Cap leaderboard
- Final points table

### 🔐 Authentication
- Login system
- Protected routes
- User roles
- JWT authentication

---

## 🛠 Tech Stack

### Frontend
- React.js
- React Router
- Context API
- Recharts
- React Icons
- CSS (Custom Brutalist Design System)

### Backend
- Flask
- Flask REST APIs
- JWT Authentication

### Database
- MySQL

### Data Processing
- Python
- Pandas
- NumPy

---

## 📂 Project Structure

```text
CreaseControl/
│
├── backend/
│   ├── app.py
│   ├── routes/
│   ├── services/
│   ├── models/
│   └── database/
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── styles/
│   │   ├── context/
│   │   └── utils/
│
├── data/
│   ├── matches.csv
│   ├── deliveries.csv
│   └── players.csv
│
└── README.md
