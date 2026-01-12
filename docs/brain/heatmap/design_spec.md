# Global Haircut Index - Design Spec

## Overview
A web platform for travelers to track and compare haircut prices and experiences globally.

## User Interface
- **Theme**: Premium Dark Mode with Glassmorphism.
- **Color Palette**:
  - Background: `#0f172a` (Deep Navy)
  - Accent 1: `#38bdf8` (Cyan)
  - Accent 2: `#818cf8` (Indigo)
  - Text: `#f8fafc` (Slate White)
- **Components**:
  - **Dynamic Background**: Animated blobs with blur effects.
  - **Glass Header**: Sticky header with logo and "Add Cut" trigger.
  - **Stats Hero**: High-level summary of global haircut data.
  - **Global Heatmap**: Interactive world map visualizing price distribution with hover tooltips and colored regions.
  - **Filter Controls**: Unified section for search, sorting, and currency toggling.
  - **Haircut Cards**: Modular cards with rating stars, price, and location.

## Technical Architecture
- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+).
- **Database**: Firebase Firestore (NoSQL).
- **State Management**: Reactive UI updates based on data changes.
- **Currency Logic**: Real-time estimations based on hardcoded/fetched reference rates.

## Data Model (Firestore)
### Collection: `haircuts`
```json
{
  "id": "string (UUID)",
  "country": "string",
  "city": "string",
  "price": "number",
  "currency": "string (ISO code)",
  "rating": "number (1-5)",
  "comment": "string",
  "date": "timestamp",
  "timestamp": "number (ms)"
}
```

## Future Roadmap (V2)
- Real-time exchange rate API integration.
- User authentication and profiles.
- Image uploads for "Before/After" shots.
- Interactive global map view.
