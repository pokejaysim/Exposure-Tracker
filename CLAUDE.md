# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Exposure Therapy Progress Tracker** - a client-side web application that helps users track their exposure therapy progress for anxiety and panic disorder treatment. The app is inspired by Module 4 from "When Panic Attacks" and provides tools for logging exposures, setting life goals, performing interoceptive exercises, and tracking weekly progress.

## Architecture

### Core Technology Stack
- **Frontend**: Vanilla HTML, CSS, and JavaScript (no build process required)
- **Backend**: Firebase Realtime Database for data persistence
- **Authentication**: Firebase Auth with Google Sign-In
- **PWA**: Progressive Web App with offline capabilities and service worker
- **Deployment**: Static web hosting (GitHub Pages compatible)

### File Structure
- `index.html` - Main application HTML with embedded Firebase module scripts and PWA integration
- `script.js` - Main application JavaScript (non-module scripts)
- `firebase-config.js` - Firebase configuration (ES6 module export)
- `style.css` - Complete application styles with responsive design and PWA elements
- `manifest.json` - PWA configuration (app name, icons, display mode)
- `sw.js` - Service Worker for offline functionality and caching

### Key Application Features
1. **Life Goals**: Users can set up to 10 life goals they want to achieve without anxiety
2. **Exposure Logging**: Detailed tracking of exposure therapy sessions with:
   - Reference number generation (EXP-YYMMDD-XXX format)
   - Anxiety ratings (anticipated vs. peak)
   - Fear predictions vs. reality tracking
   - Duration and notes
3. **Interoceptive Exercises**: Built-in timer for physical exercises that mimic panic sensations
4. **Weekly Summaries**: Progress tracking with automatic exposure counting
5. **Data Export**: CSV, JSON, and PDF export capabilities
6. **Search/Filter**: Advanced filtering of exposure history
7. **PWA Features**: Offline functionality, installable app, push notifications support
8. **Sync Management**: Automatic background sync when connection returns

### Data Structure
- **Goals**: Array of 10 strings stored at `/users/{uid}/goals`
- **Exposures**: Objects with fields like date, situation, anxiety levels, notes stored at `/users/{uid}/exposures/{id}`
- **Summaries**: Weekly progress objects stored at `/users/{uid}/summaries/{id}`

## Development Commands

**No build system is required** - this is a pure client-side application. To develop:

```bash
# Serve locally (any static server)
python -m http.server 8000
# or
npx serve .
# or simply open index.html in a browser
```

## Firebase Configuration

The Firebase configuration is stored in `firebase-config.js` as an ES6 module. The main application imports Firebase SDK via CDN links in index.html and imports the config from the separate file.

**Security Note**: The Firebase API key in the config is safe to expose as it's a client-side identifier, not a secret key.

## Key Code Architecture Patterns

### Authentication Flow
- Uses Firebase Auth state observer in index.html (line 411)
- Shows login screen vs. main app based on auth state
- User data is scoped by Firebase UID

### Data Management
- Real-time listeners using Firebase `onValue()` for automatic UI updates
- All data operations are async with proper error handling
- Local state management using global `window` variables
- **Exposure History Sorting**: Entries are sorted chronologically (newest first) by combining date and time for proper ordering

### Date Handling
- Uses YYYY-MM-DD string format for dates to avoid timezone issues
- Custom `parseDateString()` function for consistent date parsing (script.js:213)
- Reference numbers generated based on date and daily sequence

### Mobile-First Design
- Responsive CSS with mobile breakpoints
- Mobile navigation tabs replace desktop tabs on small screens
- Touch-friendly controls and proper iOS input handling

### Timer System
- Built-in exercise timer with progress bar and audio feedback
- Visual and audio completion notifications
- Preset and custom duration support

## Important Implementation Details

1. **No Build Process**: Application runs directly in browser without compilation
2. **Firebase Integration**: Uses Firebase v9 SDK via CDN with modular imports
3. **PWA Offline Capability**: Service Worker provides comprehensive offline support with local storage fallback
4. **State Management**: Uses global variables and Firebase real-time listeners with offline sync queue
5. **Export Functionality**: Client-side data export to CSV/JSON/PDF formats
6. **Security**: All data is user-scoped and requires authentication
7. **Installable**: Can be installed as native-like app on mobile and desktop devices
8. **Background Sync**: Automatically syncs offline data when connection returns

## Common Development Tasks

- **Add new features**: Modify index.html for UI, script.js for logic
- **Styling changes**: Edit style.css (includes comprehensive responsive design)
- **Firebase schema changes**: Update data loading/saving functions in script.js
- **Export formats**: Modify export functions (lines 639-742 in script.js)

## Testing

No automated test framework is configured. Test manually by:
1. Opening index.html in browser
2. Testing authentication flow
3. Verifying CRUD operations for goals, exposures, summaries
4. Testing responsive design on mobile devices
5. Verifying export functionality
6. **PWA Testing**:
   - Install app via browser "Add to Home Screen" prompt
   - Test offline functionality (disable network, verify data entry works)
   - Test sync when connection returns
   - Verify service worker caching (check DevTools > Application > Service Workers)
   - Test connection status indicators