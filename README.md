# Collaborative Markdown Editor 📝🌐

## Overview

This is a real-time collaborative markdown editor built with React and Monaco Editor, enabling multiple users to edit the same document simultaneously through peer-to-peer WebRTC connections.

![Project Demo](https://placeholders.com/demo-screenshot.png)

## Features

- **Real-time Collaborative Editing**: Synchronize document changes across multiple users
- **WebRTC Peer-to-Peer Communication**: Direct document sharing without a central server
- **Markdown Formatting Shortcuts**:
  - **Bold Text**: Ctrl/Cmd + B
  - **Italic Text**: Ctrl/Cmd + I

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Hrsh-Venket/Col_Doc_Editor
   ```

2. Navigate to the project directory:
   ```bash
   cd collaborative-markdown-editor
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open `http://localhost:5173` in your browser

## 🚢 Deployment

Build the project for production:
```bash
npm run build
```

## 🤝 How Collaboration Works

1. Open the editor in multiple browser windows
2. Start typing in one window
3. Watch real-time synchronization across all connected windows

### Technical Details

The application uses Yjs to manage document state:
- Creates a shared document with `Y.Doc()`
- Uses `WebrtcProvider` for peer discovery
- Binds editor model with Yjs document via `MonacoBinding`
