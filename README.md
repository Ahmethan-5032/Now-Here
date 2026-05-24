# NOW Here

**NOW Here** is a full-stack location-based social web application that allows users to share posts on a map, explore nearby content, create profiles, interact socially, upload photos, follow routes, earn profile levels, and collect badges.

The project is built with a modern MERN-style architecture using a React + Vite frontend, an Express.js backend, and MongoDB for persistent data storage.

---

## Overview

NOW Here focuses on creating a location-aware social experience. Users can share posts connected to specific places, view posts through a map-based feed, filter content by category or tags, manage their profiles, and interact with other users through comments and social actions.

The application is designed as a student/full-stack project with real deployment support using **Vercel** for the frontend and **Render** for the backend.

---

## Core Features

### Location-Based Posts

- Users can create posts connected to a specific location.
- Posts can include:
  - Category
  - Atmosphere
  - Rating
  - Tags
  - Text content
  - Photo content
  - Location data

### Map Feed

- Posts can be displayed on an interactive map.
- Users can explore content geographically.
- Map feed supports:
  - Category filtering
  - Text search
  - Tag-based filtering
  - City/district-based filtering logic

### Route and Location Flow

- The app supports route-related functionality.
- Users can interact with locations and map-based post points.
- Designed to support location discovery and social exploration.

### Profile System

Each user profile can include:

- Bio
- City
- Website
- Status
- Interests
- Theme preference
- Profile level
- Score
- Profile completion percentage
- Last activity information

### Level and Badge System

- Users can gain score through activity.
- Profile levels can be increased based on usage.
- Badge logic can be used to reward user interaction and progress.

### Camera and Photo Upload

- Users can take or upload photos.
- Mobile camera support includes:
  - Front camera
  - Back camera
  - Camera switch button

### Social Interaction

The application is designed to support social features such as:

- User posts
- Comments
- Profile activity
- User-based interaction
- Map-based discovery

---

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- Responsive UI
- Vercel deployment support

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- CORS configuration
- Render deployment support

### Database

- MongoDB Atlas
- User data
- Post data
- Comment data
- Profile data
- Badge and level-related data

---

## Project Architecture

```txt
NOW-Here/
│
├── client/              # React + Vite frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── server/              # Express.js backend API
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── package.json
│   └── server.js
│
├── README.md
└── .gitignore
