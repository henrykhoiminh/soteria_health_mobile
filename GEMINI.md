# Soteria Health Mobile

## Project Overview

This is a React Native mobile application for Soteria Health, a wellness platform. The app is built with Expo and TypeScript, and uses Supabase for the backend. The app is designed to help users take control of their wellness through community-driven, holistic routines.

The app features a comprehensive onboarding process, personalized dashboards, routine builders, social features like friends and circles, and a unique "Harmony" system that encourages balanced wellness across Mind, Body, and Soul.

## Building and Running

### Prerequisites

- Node.js and npm
- Expo CLI
- A Supabase project with the necessary tables and functions (see `README.md` for details)

### Key Commands

- **Install dependencies:**
  ```bash
  npm install
  ```

- **Run the development server:**
  ```bash
  npm start
  ```

- **Run on iOS:**
  ```bash
  npm run ios
  ```

- **Run on Android:**
  ```bash
  npm run android
  ```

- **Run on web:**
  ```bash
  npm run web
  ```

- **Lint the code:**
  ```bash
  npm run lint
  ```

- **Clear the cache:**
  ```bash
  npm start -- --clear
  ```

## Development Conventions

### Code Style

The project uses ESLint for code linting. The configuration is in `eslint.config.js`. Please run `npm run lint` to check your code before committing.

### State Management

The project uses a combination of React Context (`AuthContext`) for global state and local component state (`useState`). Supabase is the single source of truth for data.

### Styling

The project uses `StyleSheet` for performance and inline styles for dynamic values. The color palette and typography are defined in `constants/theme.ts`.

### File Structure

The project follows the standard Expo Router file structure.

- `app/`: Contains all the screens and routes.
- `assets/`: Contains all static assets like images, fonts, and animations.
- `components/`: Contains reusable components.
- `constants/`: Contains theme constants and other configuration.
- `hooks/`: Contains custom hooks.
- `lib/`: Contains core utilities, contexts, and Supabase client.
- `sql/`: Contains database migration files.
- `types/`: Contains TypeScript type definitions.

### Database Migrations

Database migrations are located in the `sql/` directory. They should be run in the Supabase SQL Editor in the order specified in the `README.md` file.

---

**Agent Focus:** Primarily help with animation design and builds.