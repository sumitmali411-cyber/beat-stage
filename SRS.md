# Software Requirements Specification (SRS)
## Project: BEATSTAGE (Audio Visualizer Pro)

### 1. Introduction
**1.1 Purpose**
Beatstage is a web-based, real-time audio visualization platform. It allows users to create personalized, interactive 2D and 3D stages that react dynamically to audio input. The platform is designed for music enthusiasts, DJs, and content creators who want to pair their audio with compelling, customizable visual experiences.

**1.2 Scope**
The application focuses on high-performance, browser-based rendering using WebGL. It provides a suite of tools for users to upload local audio files, manage virtual "dancers" (3D models and 2D figures), and customize environmental effects. User configurations and assets are persisted in the cloud.

---

### 2. Overall Description
**2.1 User Characteristics**
- **Music Enthusiasts:** Looking for a visual companion to their local music library.
- **Content Creators/Streamers:** Needing dynamic backgrounds or visualizers for their streams.
- **3D Artists:** Wanting to test and visualize their custom `.glb`/`.gltf` models reacting to audio.

**2.2 Technical Environment**
- **Frontend:** React 19, Tailwind CSS, Zustand (State Management).
- **3D/Rendering Engine:** Three.js, React Three Fiber, React Three Drei.
- **Backend/Database:** Firebase Authentication (Google SSO), Cloud Firestore (Data Persistence).
- **Audio Processing:** Web Audio API (AnalyserNode for real-time frequency data extraction).

---

### 3. Core Features (Current State)
**3.1 Authentication & Cloud Sync**
- Users authenticate via Google SSO.
- User profiles, uploaded song metadata, and stage configurations (figures, backgrounds) are synced in real-time using Firestore.

**3.2 Audio Management**
- **Local File Support:** Users can upload local audio files (MP3, WAV, etc.) directly to the browser.
- **Playback Controls:** Play, pause, volume adjustment, and progress tracking.
- *Note: External streaming (e.g., YouTube) has been explicitly removed to ensure 100% playback reliability and avoid bot-detection blocks.*

**3.3 Stage & Visual Customization**
- **View Modes:** Toggle between 3D WebGL environments and 2D Canvas environments.
- **Backgrounds:** Selectable environments (Neon Grid, Stars, Space, Gradient).
- **Figure Management:** 
  - Add built-in 2D figures or 3D robotic models.
  - Upload custom 3D models (`.glb`, `.gltf`).
- **Transform Controls:** Real-time adjustment of figure position (X,Y,Z), rotation, scale, color, audio sensitivity, movement speed, and reaction intensity.

---

### 4. Future Enhancements (Pushing it Further)
To elevate Beatstage from a personal visualizer to a professional-grade tool, the following features are proposed:

**4.1 Advanced Audio Inputs**
- **Microphone / Line-In Support:** Allow the visualizer to react to live audio input from the user's microphone or system audio (crucial for live DJ sets or streamers).
- **Official API Integrations:** Explore official OAuth integrations with Spotify or SoundCloud (Note: This may be limited to metadata/playback control rather than raw audio data due to DRM, but would improve the UX for premium users).

**4.2 Enhanced Visual Fidelity & Post-Processing**
- **Post-Processing Pipeline:** Implement `postprocessing` for React Three Fiber to add professional effects like Bloom, Chromatic Aberration, Glitch effects, and Depth of Field.
- **Audio-Reactive Particles:** Introduce particle systems (using shaders) that emit or change behavior based on specific frequency bands (e.g., bass drops trigger particle explosions).
- **Lighting Controls:** Allow users to customize the color, intensity, and position of stage lights, making them audio-reactive.

**4.3 Export & Sharing**
- **Video Export:** Implement `MediaRecorder` API to allow users to record their stage performance (Canvas + Audio) and download it as a `.webm` or `.mp4` file for social media sharing.
- **Shareable Stages:** Generate unique URLs for specific stage configurations, allowing users to share their visual setups with others in a "View Only" mode.

**4.4 Advanced Audio Analysis**
- **Beat Detection:** Implement a more sophisticated beat detection algorithm (beyond simple frequency averaging) to trigger specific, hard-coded animations exactly on the beat.
- **Multi-band EQ UI:** Provide a visual equalizer so users can see exactly which frequencies are driving which visual elements.
