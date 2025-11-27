# Prana-Rakshak 🛡️

**Prana-Rakshak** (formerly Traffic Sathi) is an intelligent, full-stack multi-agent AI system designed to protect your health by providing real-time insights into air quality and traffic conditions. It combines a powerful **FastAPI** backend powered by **Google's Agent Development Kit (ADK)** with a stunning, modern **Next.js** frontend.

## 🎯 Vision

To empower individuals to make informed decisions about their daily commute and outdoor activities by correlating environmental data with traffic patterns, presented through an intuitive and beautiful conversational interface.

## 🏗️ Tech Stack

### Frontend 💻
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, CSS Modules
- **UI Components**: Lucide React, Framer Motion (for animations)
- **Design**: Glassmorphism, Dark Mode, Responsive Layout

### Backend ⚙️
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **AI Framework**: [Google ADK](https://github.com/google/project-idx-python) (Agent Development Kit)
- **LLM**: Google Gemini 2.5 Flash Lite
- **Database**: SQLite (via `aiosqlite`)
- **Tools**: `ipinfo.io` (Geolocation), Google Search (Research)

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Google GenAI API Key**
- **IPInfo Token** (Optional, for better location accuracy)

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Create a virtual environment and activate it:
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory:
```env
GOOGLE_API_KEY=your_google_api_key
IPINFO_TOKEN=your_ipinfo_token
```

Run the backend server:
```bash
python -m app.main
# OR using uvicorn directly if configured
uvicorn app.main:app --reload
```
The API will be available at `http://localhost:8000`.

### 2. Frontend Setup

Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🏛️ Architecture

The system follows a Client-Server architecture:

1.  **Frontend (Client)**: Captures user input and precise geolocation (via Browser API). Sends requests to the backend API. Displays streaming responses, AQI cards, and traffic data in a rich UI.
2.  **Backend (Server)**: Hosts the Multi-Agent System.
    -   **MasterMind Agent**: Orchestrates the workflow.
    -   **Location Agent**: Refines location data.
    -   **AQI & Traffic Agents**: Perform parallel research using Google Search.
    -   **Memory Service**: Maintains conversation context across sessions.

## ✨ Features

-   **Real-time AI Chat**: Conversational interface to query environmental data.
-   **Live Geolocation**: Uses browser geolocation for hyper-local accuracy.
-   **Visual Data Cards**: Beautifully designed cards for AQI and Weather data.
-   **Persistent Sessions**: Chat history is saved and can be resumed.
-   **Adaptive UI**: "Prana Vayu" (Nature) and "Traffic Sathi" (Cyberpunk) themes (configurable).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
