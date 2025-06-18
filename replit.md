# HR Leave Management System

## Overview

This is a comprehensive HR Leave Management System built as a web application that handles employee leave requests, approvals, and tracking. The system provides different interfaces for HR managers and employees, with real-time notifications, calendar integration, and AI-powered assistance.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Vanilla JavaScript, HTML5, CSS3
- **Architecture Pattern**: Component-based modular design
- **UI Framework**: Custom CSS with modern design system using CSS variables
- **Icons**: Font Awesome 6.4.0
- **Fonts**: Google Fonts (Inter)

### Backend Architecture
- **Database**: Firebase Firestore (NoSQL document database)
- **Authentication**: Firebase Authentication with Google OAuth and demo accounts
- **Real-time Updates**: Firebase real-time listeners for live data synchronization
- **File Storage**: Firebase Storage (configured but not actively used)

### External Integrations
- **AI Assistant**: OpenAI API integration for intelligent HR chatbot
- **Authentication**: Google OAuth for secure user authentication
- **Demo Mode**: Built-in demo users for testing and development

## Key Components

### 1. Authentication System (`firebase-config.js`)
- **Purpose**: Handles user authentication and session management
- **Features**: Google OAuth, demo accounts for testing, role-based access control
- **Architecture Decision**: Firebase Auth chosen for its simplicity and integration with Firestore

### 2. Leave Management Core (`leave-manager.js`)
- **Purpose**: Central system for managing leave requests, approvals, and balance tracking
- **Features**: Request submission, approval workflow, balance calculation, conflict detection
- **Architecture Decision**: Class-based structure for maintainability and state management

### 3. Calendar System (`calendar.js`)
- **Purpose**: Visual representation of leave schedules and conflict management
- **Features**: Monthly calendar view, leave visualization, conflict highlighting
- **Architecture Decision**: Separate calendar component for better code organization

### 4. AI Chatbot (`ai-chatbot.js`)
- **Purpose**: Intelligent assistance for HR-related queries
- **Features**: Natural language processing, context-aware responses, integration with leave data
- **Architecture Decision**: OpenAI API integration for advanced conversational capabilities

### 5. Main Application Controller (`script.js`)
- **Purpose**: Central app orchestration and navigation management
- **Features**: View switching, authentication state management, component initialization
- **Architecture Decision**: Single controller pattern for simplified state management

### 6. Utility Functions (`utils.js`)
- **Purpose**: Common helper functions and data manipulation utilities
- **Features**: Date formatting, validation, DOM manipulation helpers
- **Architecture Decision**: Centralized utilities to avoid code duplication

## Data Flow

### Authentication Flow
1. User accesses application → Loading screen displayed
2. Check existing authentication state
3. If not authenticated → Show login screen
4. User signs in via Google OAuth or demo account
5. Set user role and permissions → Initialize main application

### Leave Request Flow
1. Employee submits leave request through form
2. System validates dates and checks conflicts
3. Request stored in Firestore with pending status
4. HR receives real-time notification
5. HR reviews and approves/rejects request
6. Employee receives notification of decision
7. Calendar updated with approved leave

### Real-time Updates
- Firestore listeners provide real-time synchronization
- All users see live updates for leave requests and approvals
- Notifications system keeps users informed of relevant changes

## External Dependencies

### Core Dependencies
- **Firebase SDK**: Authentication, Firestore database, real-time updates
- **OpenAI API**: AI chatbot functionality
- **Font Awesome**: Icon library for UI elements
- **Google Fonts**: Typography (Inter font family)

### Development Dependencies
- **Python HTTP Server**: Development server for local testing
- **Node.js**: Package management and potential future backend services

## Deployment Strategy

### Current Setup
- **Development Server**: Python HTTP server on port 5000
- **Static Hosting**: Designed for static web hosting platforms
- **Environment Configuration**: Firebase config and API keys managed through environment variables

### Production Considerations
- Replace demo Firebase config with production credentials
- Implement proper environment variable management
- Consider CDN for static assets
- Set up proper domain and SSL certificates

### Scalability Approach
- Firebase provides automatic scaling for database and authentication
- Frontend can be served from any static hosting service
- OpenAI API calls are stateless and horizontally scalable

## Changelog

```
Changelog:
- June 18, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```