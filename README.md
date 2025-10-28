# collab-room

Real-time collaboration rooms for teams to brainstorm, chat, and keep ideas organized.

## Vision

Create a lightweight web app where anyone can open a shared room, invite others, and collaborate live through:
- Shared chat feed with typing indicators and presence.
- Visual canvas for sticky notes, sketches, and structured boards.
- Quick tasks/decisions tracker so meetings result in actionable next steps.

## Tech Stack (initial proposal)

- Frontend: React + Vite + TypeScript, Tailwind CSS for fast UI iteration.
- Backend: Node.js (Express) with WebSocket support via Socket.IO.
- Persistence: Start in-memory for speed; graduate to Prisma + SQLite/Postgres when needed.
- Auth: Begin with anonymous guest links; layer email/SSO later.

## Milestones

1. **MVP Foundations**
   - Landing page with room creation/join flow.
   - Backend room/session management (in-memory).
   - Real-time chat prototype within a room.
2. **Collaboration Enhancements**
   - Presence + typing indicators.
   - Shared canvas with draggable sticky notes.
   - Persistent storage for rooms and notes.
3. **Polish + Production Readiness**
   - Authentication, invite management, and permissions.
   - Deployment pipeline, observability, and documentation.

## Current Focus

Kick off with milestone #1:
- Scaffold React front-end and Express backend in a monorepo.
- Implement landing page UI to create/join a room.
- Wire up API endpoint to spin up in-memory rooms (UUIDs) and return join tokens.

## How to Run

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Comes with Node.js

### Installation & Running

1. **Install dependencies** (this installs for the root workspace, client, and server):
   ```bash
   npm install
   ```

2. **Start the development servers** (runs both client and server concurrently):
   ```bash
   npm run dev
   ```

3. **Access the application**:
   - Frontend (client): Typically runs on `http://localhost:5173`
   - Backend (server): Typically runs on `http://localhost:3000`

### Other Commands

- **Build for production**: `npm run build`
- **Lint the client code**: `npm run lint`
- **Type check the server**: `npm run typecheck`

### Project Structure

This is a monorepo with two workspaces:
- `client/` - React + Vite + TypeScript frontend
- `server/` - Express + Socket.IO + TypeScript backend

---

_Next step: set up the project structure and build the landing page skeleton._
