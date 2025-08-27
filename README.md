# Inksa Admin

React-based admin panel for the Inksa platform, built with Vite and Tailwind CSS.

## Development Setup

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd inksa-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Set the `VITE_API_BASE_URL` in your `.env` file:
   ```env
   # For development with local backend
   VITE_API_BASE_URL=http://localhost:5000
   
   # For development with remote backend (inksa-auth-flask)
   VITE_API_BASE_URL=https://inksa-auth-flask-dev.onrender.com
   
   # For production deployment on same domain (leave empty)
   VITE_API_BASE_URL=
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Features

### Admin Logs Page
The logs page (`/logs`) provides comprehensive audit logging with:

**Filtering Options:**
- Text search (`q`) - searches across messages and context
- Log level filtering (`level`) - info, warn, error, debug
- Action/event type filtering (`action`)
- Actor filtering (`actor`) - admin user ID or name
- Date range filtering (`date_from`, `date_to`)

**Table Features:**
- Server-side pagination with configurable page sizes (10, 25, 50, 100)
- Sortable columns (timestamp, level, action, actor)
- Responsive design with horizontal scrolling on smaller screens

**State Management:**
- URL query parameters sync with filter state
- Shareable URLs with current filter/pagination state
- Browser back/forward navigation preserves state
- Filter changes update URL and reload data

**CSV Export:**
- Export current filtered view as CSV
- Automatic filename with date (`logs_YYYY-MM-DD.csv`)
- Respects all active filters

**Query Parameters:**
- `page` - current page number
- `per_page` - items per page (10, 25, 50, 100)
- `sort_by` - sort field (timestamp, level, action, actor)
- `order` - sort direction (asc, desc)
- `q` - text search
- `level` - log level filter
- `action` - action type filter
- `actor` - actor filter
- `date_from` - start date (YYYY-MM-DD)
- `date_to` - end date (YYYY-MM-DD)

## API Integration

The application uses a centralized API client (`src/services/api.js`) that:
- Reads `VITE_API_BASE_URL` from environment variables
- Defaults to relative URLs for same-origin deployments
- Includes automatic authentication token handling
- Provides standardized error handling
- Supports request timeouts and cancellation
- Implements retry logic for network errors

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── FilterBar.jsx    # Logs page filter controls
│   ├── DataTable.jsx    # Sortable data table component
│   └── Pagination.jsx   # Pagination controls
├── pages/               # Page components
│   └── LogsPage.jsx     # Admin logs page
├── services/            # API and external services
│   ├── api.js          # Centralized API client
│   └── authService.js   # Authentication service
└── utils/               # Utility functions
    └── url.js          # URL parameter utilities
```

## Development

### Code Style
- Follow existing ESLint configuration
- Use Tailwind CSS for styling
- Maintain existing component patterns
- Keep components focused and reusable

### Testing
Run linting:
```bash
npm run lint
```

Build the project:
```bash
npm run build
```
