# VTU Results Dashboard

A modern web dashboard for VTU results with:
- 🔎 Branch-wise filtering system
- 🏆 Topper ranking system
- Student/semester result views

## Tech Stack
- React (Vite)
- Material UI
- Firebase (Realtime Database)

## Features
- Filter students by branch, batch, and semester
- View top rankers (toppers) per branch/semester
- Responsive, modern UI

## Setup
1. Install dependencies:
   ```sh
   npm install
   ```
2. Add your Firebase config to `.env` or directly in the code.
3. Start the dev server:
   ```sh
   npm run dev
   ```

## Firebase Data Structure
See `../firebase_usage_guide.md` for details.

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
