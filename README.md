<div align="center">
  <h1 align="center">COMPILE.</h1>
  <h3 align="center">Thinking, compiled.</h3>
</div>

<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="COMPILE Banner" width="100%" />
</div>

<br/>

**COMPILE.** is an intelligent, Notion-style workspace designed to revolutionize personal productivity. It combines a flexible block-based editor with a sleek, distraction-free interface, allowing you to organize your thoughts, projects, and goals in one place.

## ✨ Features

- **Block-Based Editor**: Create and reorganize content with headings, to-do lists, text blocks, and more, just like Notion.
- **Hierarchical Pages**: Organize pages within pages (and folders) to structure your knowledge base.
- **Intelligent Dashboard**: A central hub to view your workspaces and quick access to pages.
- **Dark Mode**: A carefully crafted dark theme for focused work in low-light environments.
- **Cloud Sync**: Real-time synchronization using Firebase Firestore.
- **Authentication**: Secure Google Sign-In via Firebase Auth.
- **Responsive Design**: Optimized for desktop with a mobile restriction view for a focused desktop-first experience.
- **Undo/Redo**: robust history management for your editing sessions.
- **AI Integration**: (Powered by Gemini) - *Configuration ready*.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (Runtime/CDN for flexibility)
- **State Management**: React Hooks & Context
- **Backend & Auth**: Firebase (Firestore, Authentication)
- **Editor**: Custom block logic + CodeMirror (for code blocks)
- **Icons**: Lucide React

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites

- **Node.js** (Latest LTS recommended)
- **Firebase Project**: You need a Firebase project with Firestore and Auth enabled.

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository_url>
    cd <project_directory>
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file in the root directory and add your keys:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
    *Note: Firebase configuration is handled in `services/persistenceService.ts` or via standard Firebase SDK auto-config if hosted on Firebase Hosting. Ensure your local environment has access to the necessary Firebase credentials.*

4.  **Run the development server**
    ```bash
    npm run dev
    ```

## 📦 Deployment

The app is set up to be easily deployed to Firebase Hosting or any static site provider.

```bash
npm run build
```

---

<div align="center">
  <sub>Built with ❤️ by the COMPILE team</sub>
</div>
