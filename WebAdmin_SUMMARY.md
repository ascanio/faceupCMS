# FaceUp CMS - Application Summary

## Overview
FaceUp CMS is a Content Management System designed to manage AI filters, categories, and onboarding content for the FaceUp iOS app. It provides a web-based interface for content administrators to create, edit, organize, and manage filter content that powers the mobile application.

---

## Core Features

### 1. **Categories Management**
- **Create/Edit/Delete Categories**: Full CRUD operations for filter categories
- **Hierarchical Structure**: Support for categories and subcategories with parent-child relationships
- **Cover Images**: Upload and auto-resize cover images (192×240px) with center-crop to maintain aspect ratio
- **Slug Generation**: Auto-generates URL-friendly slugs from category names
- **Ordering**: Manual ordering with drag-and-drop support
- **Visibility Control**: Toggle categories on/off for the mobile app
- **Tags**: Add searchable tags for filtering
- **Subcategory Management**: Track which categories have subcategories

### 2. **Filters Management**
- **Create/Edit/Delete Filters**: Complete filter lifecycle management
- **Category Assignment**: Assign filters to categories and optional subcategories
- **Thumbnail Management**: Upload thumbnails (192×240px) with automatic resizing
- **AI Prompt Management**: Store and edit prompts for the Nano Banana Gemini API
- **Premium/Pro Flags**: Mark filters as premium content requiring paywall
- **Popularity Scoring**: Set popularity scores for sorting algorithms
- **Manual Ordering**: Drag-and-drop reordering within categories
- **Visibility Toggle**: Show/hide filters in the mobile app
- **Reference Image Support**: Configure filters to support reference images (1-3 images)
- **Video Filter Support**: Mark filters as video generation filters
- **Tags**: Add searchable tags for filtering

### 3. **Bulk Operations** (Filters Page)
- **Multi-Select**: Select multiple filters via checkboxes
- **Bulk Move**: Move multiple filters to different categories/subcategories
- **Bulk Duplicate**: Duplicate filters to new categories while preserving original
- **Bulk Premium Toggle**: Set premium status for multiple filters at once
- **Bulk Visibility Toggle**: Show/hide multiple filters simultaneously
- **Bulk Delete**: Delete multiple filters with confirmation

### 4. **Filters List View**
- **Read-Only List**: Display all filters in a copy-friendly format
- **Category/Subcategory Filtering**: Filter by category and subcategory
- **Copy to Clipboard**: Export filter list as formatted text
- **Reference Image Indicators**: Visual indicators for filters supporting reference images
- **Format**: `Category / Subcategory / Filter Name / Prompt [/ Allow additional images: Yes]`

### 5. **Onboarding Slider Management**
- **Create/Edit/Delete Sliders**: Manage onboarding slides for the mobile app
- **Before/After Images**: Upload before and after images (620×1344px, JPG 90% quality)
- **Title & Text**: Configure slide titles and descriptive text
- **Ordering**: Drag-and-drop ordering for slide sequence
- **Visibility Control**: Toggle slides on/off

### 6. **Image Processing**
- **Automatic Resizing**: Client-side image resizing using Canvas API
- **Aspect Ratio Preservation**: Center-crop to maintain aspect ratio without deformation
- **Format Preservation**: Maintains PNG/JPEG format based on original
- **Quality Optimization**: 
  - PNG: Lossless compression
  - JPEG: 95% quality for thumbnails, 90% for onboarding images
- **Dimension Standards**:
  - Category covers: 192×240px
  - Filter thumbnails: 192×240px
  - Onboarding images: 620×1344px

---

## Architecture

### **Frontend Architecture**
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router v7 (BrowserRouter)
- **Styling**: TailwindCSS v4 with custom gradient themes
- **Drag & Drop**: @dnd-kit/core and @dnd-kit/sortable for reordering
- **State Management**: React hooks (useState, useEffect, useMemo)
- **Real-time Updates**: Firebase Firestore onSnapshot listeners

### **Backend Architecture**
- **Database**: Firebase Firestore (NoSQL document database)
- **Storage**: Firebase Storage for image assets
- **Collections**:
  - `categories`: Category documents
  - `subcategories`: Subcategory documents with parent references
  - `filters_feed`: Filter documents
  - `onboarding_sliders`: Onboarding slide documents

### **Data Flow**
1. **Real-time Sync**: Firestore listeners (`onSnapshot`) provide real-time updates
2. **Optimistic Updates**: Local state updates immediately, Firestore updates asynchronously
3. **Batch Operations**: Firestore batch writes for bulk operations
4. **Image Upload Flow**:
   - Client-side resize → Firebase Storage → Get download URL → Save to Firestore

### **Component Structure**
```
App.tsx (Root)
├── Header (Navigation)
└── Routes
    ├── Categories Page
    │   ├── Categories Table (with drag-and-drop)
    │   └── Category Form (create/edit)
    ├── Filters Page
    │   ├── Filters Table (with drag-and-drop, bulk actions)
    │   └── Filter Form (create/edit)
    ├── Filters List Page
    │   └── Read-only list with filtering
    └── Onboarding Slider Page
        ├── Sliders Table (with drag-and-drop)
        └── Slider Form (create/edit)
```

---

## Technology Stack

### **Core Technologies**
- **React 19.1.1**: UI framework
- **TypeScript 5.9.3**: Type safety
- **Vite 7.1.7**: Build tool and dev server
- **Firebase 12.4.0**: Backend services (Firestore, Storage)

### **UI Libraries**
- **TailwindCSS 4.1.14**: Utility-first CSS framework
- **@dnd-kit**: Drag and drop functionality
  - `@dnd-kit/core`: Core drag-and-drop
  - `@dnd-kit/sortable`: Sortable list components
  - `@dnd-kit/utilities`: Helper utilities

### **Development Tools**
- **ESLint**: Code linting
- **PostCSS**: CSS processing
- **TypeScript ESLint**: TypeScript-specific linting

---

## Data Models

### **Category**
```typescript
{
  id?: string;                    // Firestore document ID
  name: string;                   // Display name
  slug: string;                   // URL-friendly identifier
  cover_image?: string;           // Public URL (192×240px)
  description?: string;           // Optional description
  order: number;                  // Sort order
  visible: boolean;                // Show/hide in app
  hasSubcategories?: boolean;     // Indicates if has subcategories
  tags?: string[];                // Search tags
  updatedAt?: Timestamp;          // Server timestamp
}
```

### **Subcategory**
```typescript
{
  id?: string;                    // Firestore document ID
  name: string;                   // Display name
  slug: string;                   // URL-friendly identifier
  parentCategoryId: string;       // Reference to parent category
  cover_image?: string;           // Public URL (192×240px)
  description?: string;           // Optional description
  order: number;                  // Sort order
  visible: boolean;                // Show/hide in app
  tags?: string[];                // Search tags
  updatedAt?: Timestamp;          // Server timestamp
}
```

### **Filter**
```typescript
{
  id?: string;                    // Firestore document ID
  name: string;                   // Display name
  category: string;               // Category document ID
  subcategory?: string;           // Optional subcategory document ID
  thumb_128: string;              // Thumbnail URL (192×240px)
  tags?: string[];                // Search tags
  prompt: string;                // AI prompt for Gemini API
  isPro: boolean;                 // Premium/paywall flag
  popularity: number;             // Popularity score
  order: number;                  // Manual sort order
  visible: boolean;                // Show/hide in app
  supports_reference_images?: boolean;  // Reference image support
  max_reference_images?: number;        // Max ref images (1-3)
  isVideo?: boolean;              // Video filter flag
  updatedAt?: Timestamp;          // Server timestamp
}
```

### **OnboardingSlider**
```typescript
{
  id?: string;                    // Firestore document ID
  title: string;                  // Slide title
  text: string;                   // Slide description
  before_image_url: string;        // Before image URL (620×1344px)
  after_image_url: string;        // After image URL (620×1344px)
  order: number;                   // Sort order
  visible: boolean;                // Show/hide in app
  updatedAt?: Timestamp;          // Server timestamp
}
```

---

## Key Functionality

### **Drag & Drop Reordering**
- Categories, subcategories, filters, and onboarding sliders support drag-and-drop reordering
- Uses `@dnd-kit` library with pointer and keyboard sensors
- Optimistic UI updates with Firestore batch writes
- Order values are recalculated and saved to Firestore

### **Real-time Synchronization**
- All pages use Firestore `onSnapshot` listeners for real-time updates
- Changes from multiple users/devices sync automatically
- No manual refresh required

### **Image Processing Pipeline**
1. User selects image file
2. Client-side resize using Canvas API (`imageResize.ts`)
3. Aspect ratio preserved via center-crop
4. Format maintained (PNG/JPEG)
5. Upload to Firebase Storage
6. Get public download URL
7. Save URL to Firestore document

### **Bulk Operations**
- Multi-select via checkboxes
- Batch Firestore operations for efficiency
- Toast notifications for user feedback
- Confirmation dialogs for destructive actions

### **Auto-Generated Fields**
- **Slugs**: Auto-generated from names (lowercase, hyphenated)
- **Order**: Auto-assigned based on current max order + 1
- **Timestamps**: Server-side timestamps via `serverTimestamp()`

### **Smart Defaults**
- Subcategories inherit parent category cover image if not provided
- Filters inherit category/subcategory cover image if not provided
- New items default to `visible: true`
- Order auto-increments for new items

---

## Security & Access Control

### **Current Configuration** (Development)
- **Firestore Rules**: Open read/write access (`allow read: if true; allow write: if true`)
- **Storage Rules**: Not shown but likely similar open access
- **Note**: Production should implement proper authentication-based rules

### **Recommended Production Rules**
- Require Firebase Authentication for write operations
- Public read access for mobile app consumption
- Authenticated admin access for CMS operations

---

## User Interface

### **Design System**
- **Primary Color**: Orange gradient (#FF9827 to #ff8c00)
- **Background**: Light beige (#F2EFEB)
- **Typography**: System fonts with bold headings
- **Components**: Rounded corners, shadows, gradient buttons
- **Responsive**: Desktop-first design with fixed sidebar forms

### **Navigation**
- Sticky header with navigation links
- Active route highlighting
- Icon-based navigation with labels

### **Feedback Systems**
- Toast notifications for success/error/warning
- Loading states on form submissions
- Confirmation dialogs for deletions
- Visual indicators (badges, icons) for status

---

## Deployment

### **Build Process**
```bash
npm run build  # TypeScript compilation + Vite build
```

### **Output**
- Static files in `dist/` directory
- Can be deployed to any static hosting:
  - Firebase Hosting
  - Vercel
  - Netlify
  - AWS S3 + CloudFront

### **Environment Variables**
- Firebase config via `.env.local` (optional)
- Defaults provided in `firebase.ts` for development

---

## Future Enhancements (Potential)

1. **Authentication**: Firebase Auth integration for admin access
2. **Search**: Full-text search across filters/categories
3. **Analytics**: Track filter usage and popularity
4. **Versioning**: Track changes and rollback capabilities
5. **Export/Import**: Bulk data export/import functionality
6. **Preview**: Preview filters in mobile app format
7. **Multi-language**: Support for multiple languages
8. **Image Optimization**: WebP format support
9. **Audit Log**: Track who made what changes
10. **Permissions**: Role-based access control

---

## File Structure Summary

```
cms/
├── src/
│   ├── App.tsx                 # Main app component with routing
│   ├── main.tsx                # Entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── lib/
│   │   ├── firebase.ts         # Firebase initialization
│   │   └── imageResize.ts      # Image processing utility
│   └── pages/
│       ├── Categories.tsx      # Categories management
│       ├── Filters.tsx          # Filters management
│       ├── FiltersList.tsx      # Read-only filter list
│       └── OnboardingSlider.tsx # Onboarding management
├── public/                     # Static assets
├── dist/                       # Build output
├── firebase.json               # Firebase config
├── firestore.rules            # Firestore security rules
└── storage.rules              # Storage security rules
```

---

## Summary

FaceUp CMS is a modern, real-time content management system built with React and Firebase. It provides comprehensive tools for managing AI filter content with features like drag-and-drop ordering, bulk operations, automatic image processing, and hierarchical category management. The architecture emphasizes real-time synchronization, optimistic UI updates, and a clean, intuitive interface for content administrators.

