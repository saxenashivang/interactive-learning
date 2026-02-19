# LearnFlow — Interactive AI Learning Platform

An AI-powered learning platform that renders **interactive visual outputs** (React components, Mermaid diagrams, Leaflet maps, Chart.js) instead of plain markdown. Built with LangGraph, Next.js, and multi-provider LLM support.

## Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  Next.js 15     │────▶│  FastAPI + LangGraph │────▶│  PostgreSQL     │
│  React Frontend │◀────│  Agent Server        │     │  + pgvector     │
│  Tailwind CSS   │     │                      │────▶│  Redis          │
│  Firebase Auth  │     │  Agents:             │     │  MinIO (S3)     │
│  useStream      │     │  • Chat Agent        │     └─────────────────┘
│  Stripe         │     │  • RAG Agent         │
│  Framer Motion  │     │  • Research Agent    │──────▶ Gemini / OpenAI
└─────────────────┘     │  • HTML Generator    │       / Anthropic
                        └─────────────────────┘
```

## Quick Start

### 1. Start Infrastructure
```bash
docker-compose up -d
```
This starts PostgreSQL (with pgvector), Redis, and MinIO.

### 2. Backend Setup
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env  # Fill in API keys
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env.local  # Fill in Firebase config
npm install
npm run dev
```

### 4. Open
Visit [http://localhost:3000](http://localhost:3000)

## Features

| Feature | Description |
|---------|-------------|
| 🎨 Interactive Output | React + Mermaid + Leaflet + Chart.js rendered in sandboxed iframes |
| 🔐 Firebase SSO | Google, GitHub, Email/Password authentication |
| 🤖 Multi-LLM | Switch between Gemini, OpenAI, Anthropic on the fly |
| 📄 PDF & Image Upload | Context-aware chat with RAG (pgvector embeddings) |
| 🔍 Deep Research | Multi-step web research with Tavily (Pro feature) |
| 📁 Projects & Categories | Organize learning by project with categories |
| 💾 Save & Flag | Bookmark and flag important conversations |
| 💳 Billing | Stripe subscriptions (Free / Pro / Team) |
| 🌙 Dark Mode | Premium dark UI with glassmorphism effects |

## Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS, Framer Motion, Zustand
- **Backend**: Python, FastAPI, LangGraph v1, LangChain
- **Database**: PostgreSQL 16 + pgvector, Redis 7
- **Storage**: MinIO/S3
- **Auth**: Firebase
- **Billing**: Stripe
- **LLMs**: Gemini, OpenAI, Anthropic
