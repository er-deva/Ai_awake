# Attention Meet App - Installation & Setup Guide

This guide will help you install and run the **attention-meet-app** on your new computer using Visual Studio Code.

## Prerequisites
Before you start, make sure you have the following installed on your new computer:
1. **[Node.js](https://nodejs.org/)** (v18 or higher recommended)
2. **[Python](https://www.python.org/downloads/)** (v3.10 or higher recommended)
3. **[Visual Studio Code](https://code.visualstudio.com/)**

---

## Step 1: Extract the Zip File
1. Extract the `attention-meet-app.zip` file a directory of your choice.
2. Open **Visual Studio Code**.
3. Go to `File` > `Open Folder...` and select the extracted `attention-meet-app` folder.

---

## Step 2: Backend Setup (Python)

1. Open a new terminal in VS Code (`Terminal` > `New Terminal`).
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```
3. Create a new virtual environment (recommended):
   *If you are using Windows:*
   ```bash
   python -m venv venv
   ```
4. Activate the virtual environment:
   *If you are using Windows:*
   ```bash
   .\venv\Scripts\activate
   ```
   *If you are using macOS/Linux:*
   ```bash
   source venv/bin/activate
   ```
5. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
6. Set up your environment variables:
   - Create a copy of `.env.example` and name it `.env`.
   - Update the values in the `.env` file according to your database/setup.
7. Run the backend server:
   ```bash
   python app.py
   ```
   *The backend should now be running (typically on `http://127.0.0.1:5000` or port 5001).*

---

## Step 3: Frontend Setup (React/Node.js)

1. Open a **second** terminal in VS Code by clicking the `+` icon in the terminal panel.
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Install the required Node dependencies:
   ```bash
   npm install
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend should now be running and give you a local URL (e.g., `http://localhost:5173`).*

---

## Troubleshooting
- **Port already in use**: If you get a port error, make sure no other applications are using the required ports (e.g., 5000/5001 or 5173).
- **Execution Policies (Windows)**: If you get an error activating the Python virtual environment on Windows, you may need to open an Administrator PowerShell and run: `Set-ExecutionPolicy Unrestricted -Scope CurrentUser`.
