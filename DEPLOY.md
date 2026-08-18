# Deploy Route to Strip

This game needs a Node.js host because multiplayer rooms use Socket.IO.

## Replit, no GitHub

1. Create a Replit account.
2. Create a new Node.js app.
3. Upload this project zip.
4. Press Run.
5. Use the public Replit URL to play.

## Render

Render is best with GitHub, but the included `render.yaml` and `package.json`
are ready for a Node web service:

- Build command: `npm install`
- Start command: `npm start`
- Node version: `20`

## Railway / Fly.io

Use the same settings:

- Install: `npm install`
- Start: `npm start`
- Port: provided by the platform as `PORT`
