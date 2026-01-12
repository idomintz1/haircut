# Implementation Plan - Global Haircut Index (Vanilla JS)

## Goal
Build a responsive, premium-feel web application to track and rank men's haircut prices and experiences worldwide. 

> [!NOTE]
> **Tech Stack Change**: Switching to Vanilla HTML/JS/CSS because Node.js is not available. This prevents environment setup issues while delivering the same premium UI/UX.

## User Review Required
> [!NOTE]
> Data persistence uses `localStorage`. Data is saved only on the current device.

## Proposed Changes

### Project Setup
- **Stack**: HTML5, Vanilla CSS (Modern), Vanilla JS (ES6+).
- **Icons**: FontAwesome (via CDN) or inline SVGs.
- **Fonts**: Google Fonts (Inter/Outfit).

### File Structure
- **[NEW]** `index.html`: Main entry point containing the structure (Header, Form Modal, Grid).
- **[NEW]** `style.css`: All styles using CSS variables, flexbox/grid, and glassmorphism effects.
- **[NEW]** `script.js`: Logic for state management, localStorage, and UI rendering.

### Key Components (Logical)
1.  **Header**: Logo and "Add Haircut" button.
2.  **Hero Section**: Brief intro with animated gradient text.
3.  **Haircut List**: Grid of cards showing:
    - Country/City
    - Price (converted/displayed clearly)
    - Rating (Stars)
    - Comment
    - Date
4.  **Add Form (Modal)**:
    - Inputs: Country, City, Price, Currency, Rating, Comment.
    - Validation basics.

## Verification Plan
### Manual Verification
- Open `index.html` in browser.
- Verify "Add Haircut" opens modal.
- Submit a new haircut; verify it appears in the grid.
- Reload page; verify data persists.
- Check mobile responsiveness.
