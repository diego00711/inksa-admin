# Inksa Admin Dashboard

Admin dashboard for the Inksa platform built with React + Vite.

## Features

- User management and monitoring
- Restaurant approval and management
- Order tracking and analytics
- Admin logs with filtering, pagination, and CSV export
- Financial reports and analytics

## Environment Variables

Create a `.env.local` file based on `.env.example` and configure the following variables:

```bash
# API Configuration
VITE_API_BASE_URL="https://inksa-auth-flask-dev.onrender.com"
```

### Environment Variables Reference

- `VITE_API_BASE_URL`: Base URL for the backend API. Defaults to `https://inksa-auth-flask-dev.onrender.com` if not specified.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create your environment file:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Logs Page

The admin logs page provides comprehensive audit trail functionality:

- **Server-side filtering**: Search by text, action, admin email, and date range
- **Pagination**: Navigate through logs with configurable page sizes (10, 20, 50, 100 items per page)
- **Sorting**: Order by timestamp (newest or oldest first)
- **CSV Export**: Download filtered logs with configurable limits (1k, 5k, 10k, 25k records)
- **Real-time updates**: Debounced search with request cancellation for optimal performance

To access the logs page, navigate to `/logs` in the admin dashboard. Ensure your backend API supports the following endpoints:
- `GET /api/logs` - Fetch logs with filters and pagination
- `GET /api/logs/export` - Export logs as CSV

## Technology Stack

- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Charts**: Recharts

## Development

This project uses Vite for fast development and building. The following scripts are available:

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint (note: using flat config)
