# Game Tracker for Friends

## Project Structure

```
gametrackerforfriends/
├── frontend/   # React Native (Expo) mobile app
└── backend/    # Python backend
```

---

## Frontend Setup

### Option A: Full Android Emulator (Android Studio)

1. Clone the repository
2. `cd frontend`
3. `npm install`
4. Download and install [Android Studio](https://developer.android.com/studio)
5. Install the **Android 15 SDK** via Android Studio's SDK Manager
6. Configure `ANDROID_HOME` environment variable (same process as your current machine)
7. `npm run android`

### Option B: Expo Go (Recommended for quick setup)

Skips the heavy Android Studio installation entirely.

1. Clone the repository
2. `cd frontend`
3. `npm install`
4. `npm start`
5. Install the **Expo Go** app on your smartphone
6. Scan the QR code shown in the terminal to launch the app over Wi-Fi

---

## Backend Setup

1. `cd backend`
2. Create a virtual environment:
   ```
   python -m venv venv
   ```
3. Activate it:
   ```
   venv\Scripts\activate
   ```
4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
5. Run the server:
   ```
   python main.py
   ```
