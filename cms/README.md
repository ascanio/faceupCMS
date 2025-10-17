# FaceUp CMS

A simple Content Management System for managing AI filters and categories for the FaceUp iOS app. Built with React, TypeScript, Vite, TailwindCSS, and Firebase.

## Features

- **Categories Management**: Create, edit, and delete filter categories
  - Cover image upload (automatically resized to 192×240)
  - Slug-based identification
  - Manual ordering and visibility control
  - Tags for search/filtering

- **Filters Management**: Create, edit, and delete AI filters
  - Thumbnail upload (automatically resized to 128×128)
  - Category assignment
  - Premium/Pro flag
  - Popularity and manual ordering
  - Custom AI prompts
  - Tags for search/filtering

- **Image Processing**: 
  - Automatic resize and crop to exact dimensions
  - No image deformation (maintains aspect ratio via center crop)
  - WebP compression for optimal file size

## Setup

### 1. Install Dependencies

```bash
cd cms
npm install
```

### 2. Firebase Configuration

The Firebase config is already set up in `src/lib/firebase.ts` with your project credentials. If you need to change it, create a `.env.local` file:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Firebase Security Rules

#### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Categories collection
    match /categories/{categoryId} {
      allow read: if true; // Public read for the app
      allow write: if request.auth != null; // Authenticated users can write
    }
    
    // Filters feed collection
    match /filters_feed/{filterId} {
      allow read: if true; // Public read for the app
      allow write: if request.auth != null; // Authenticated users can write
    }
  }
}
```

#### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Category cover images
    match /categories/{allPaths=**} {
      allow read: if true; // Public read for the app
      allow write: if request.auth != null; // Authenticated users can upload
    }
    
    // Filter thumbnails
    match /filters/{allPaths=**} {
      allow read: if true; // Public read for the app
      allow write: if request.auth != null; // Authenticated users can upload
    }
  }
}
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

### Creating Categories

1. Navigate to the **Categories** page
2. Fill in the form:
   - **Name**: Display name (e.g., "Portraits")
   - **Slug**: Lowercase identifier (e.g., "portraits")
   - **Icon**: Optional emoji or icon URL
   - **Order**: Sort order (smaller numbers appear first)
   - **Cover Image**: Upload an image (will be resized to 192×240)
   - **Description**: Optional description
   - **Visible**: Toggle to show/hide in app
   - **Tags**: Comma-separated search tags
3. Click **Create**

### Creating Filters

1. Navigate to the **Filters** page
2. Create at least one category first (filters require a category)
3. Fill in the form:
   - **Name**: Display name (e.g., "Cyber Neon")
   - **Category**: Select from existing categories
   - **Popularity**: Used for sorting (higher = more popular)
   - **Order**: Manual sort order override
   - **Premium (Pro)**: Check if filter requires Superwall paywall
   - **Prompt**: Text prompt for the Nano Banana Gemini API
   - **Tags**: Comma-separated search tags
   - **Thumbnail**: Upload an image (will be resized to 128×128)
4. Click **Create**

### Editing & Deleting

- Click **Edit** to modify an existing category or filter
- Click **Delete** to remove (confirmation required)
- Images are preserved unless you upload a new one

## Firestore Schema

### `categories/{categoryId}`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name of the category |
| `slug` | string | Lowercase identifier for queries |
| `icon` | string | Optional icon URL or emoji |
| `cover_image` | string | Public URL for cover image (192×240) |
| `description` | string | Short description |
| `order` | int | Manual ordering (smaller = first) |
| `visible` | bool | Show/hide in app |
| `tags` | array<string> | Search tags |
| `updatedAt` | timestamp | Auto-updated on edit |

### `filters_feed/{filterId}`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name of the filter |
| `category` | string | Category slug |
| `thumb_128` | string | Public URL for thumbnail (128×128) |
| `tags` | array<string> | Search tags |
| `prompt` | string | AI prompt for Nano Banana Gemini API |
| `isPro` | boolean | Premium/paywall status |
| `popularity` | int | Popularity score for sorting |
| `order` | int | Manual sort order override |
| `updatedAt` | timestamp | Auto-updated on edit |

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS v4
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Routing**: React Router v7
- **Image Processing**: Canvas API (client-side resize)

## Build for Production

```bash
npm run build
```

The optimized build will be in the `dist/` folder.

## Deploy

You can deploy to any static hosting service:

- **Firebase Hosting**: `firebase deploy --only hosting`
- **Vercel**: Connect your repo and deploy
- **Netlify**: Drag and drop the `dist/` folder

## Notes

- Images are automatically resized and cropped to exact dimensions
- WebP format is used for optimal compression
- Real-time updates via Firestore listeners
- All timestamps use `serverTimestamp()` for consistency
