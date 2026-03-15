# Zoom Meeting Manager

A full-stack application to manage Zoom meetings — list, create, and delete — built with Node.js and React, following **Clean Architecture** principles.

---

## Tech Stack

**Backend:** Node.js · Express · Axios · Joi · Winston · express-rate-limit · helmet  
**Frontend:** React · Vite  
**Auth:** Zoom Server-to-Server OAuth

---

## Features

- List upcoming meetings from your Zoom account
- Create a new scheduled meeting (topic, date, time, duration)
- Delete a meeting with graceful handling if already deleted externally
- Auto-sync every 30 seconds with Zoom
- Request validation, rate limiting, caching, and structured logging

---

## Architecture

This project follows **Clean Architecture** — each layer has one responsibility and the inner layers never depend on the outer layers.

```
        ┌──────────────────────────────┐
        │       Infrastructure         │  Zoom API, Cache
        │   ┌──────────────────────┐   │
        │   │     Presentation     │   │  Controllers, Routes
        │   │   ┌──────────────┐   │   │
        │   │   │  Use Cases   │   │   │  Business Logic
        │   │   │  ┌────────┐  │   │   │
        │   │   │  │Entities│  │   │   │  Core Data
        │   │   │  └────────┘  │   │   │
        │   │   └──────────────┘   │   │
        │   └──────────────────────┘   │
        └──────────────────────────────┘
```

---

## Project Structure

```
server/src/
├── entities/                         # Core data — Meeting class
├── interfaces/                       # Contracts — MeetingRepository
├── use-cases/                        # Business logic
│   ├── listMeetings.js
│   ├── createMeeting.js
│   └── deleteMeeting.js
├── infrastructure/
│   ├── zoom/                         # Zoom API integration
│   │   ├── zoomClient.js             # Token management + axios
│   │   └── zoomMeetingRepo.js        # Implements MeetingRepository
│   └── cache/
│       └── memoryCache.js
├── presentation/
│   ├── controllers/
│   │   └── meetingController.js
│   ├── routes/
│   │   └── meetings.js
│   └── middleware/
│       ├── validate.js               # Joi validation
│       └── errorHandler.js
├── config/
├── utils/
│   ├── logger.js                     # Winston
│   └── asyncHandler.js
└── app.js                            # Dependency Injection + Express setup
```

---

## Diagrams

### Use Case Diagram

```mermaid
flowchart LR
    User(["👤 User"])

    subgraph App["Zoom Meeting Manager"]
        UC1["List Meetings"]
        UC2["Create Meeting"]
        UC3["Delete Meeting"]
    end

    subgraph Zoom["Zoom API"]
        Z1["Fetch Meetings"]
        Z2["Schedule Meeting"]
        Z3["Remove Meeting"]
    end

    User --> UC1
    User --> UC2
    User --> UC3

    UC1 --> Z1
    UC2 --> Z2
    UC3 --> Z3
```

---

### Sequence Diagram — List Meetings

```mermaid
sequenceDiagram
    participant F as Frontend (React)
    participant R as Route
    participant C as Controller
    participant U as ListMeetingsUseCase
    participant Repo as ZoomMeetingRepo
    participant Cache as MemoryCache
    participant Z as Zoom API

    F->>R: GET /api/meetings
    R->>C: list(req, res)
    C->>U: execute()
    U->>Repo: findAll()
    Repo->>Cache: get(zoom:meetings:list)

    alt Cache HIT
        Cache-->>Repo: meetings[]
    else Cache MISS
        Repo->>Z: GET /users/me/meetings
        Z-->>Repo: raw meetings data
        Repo->>Repo: map to Meeting entities
        Repo->>Cache: set(zoom:meetings:list, 30s)
        Cache-->>Repo: ok
    end

    Repo-->>U: Meeting[]
    U-->>C: Meeting[]
    C-->>F: { success: true, data: [...] }
```

---

### Sequence Diagram — Create Meeting

```mermaid
sequenceDiagram
    participant F as Frontend (React)
    participant V as Validate Middleware
    participant C as Controller
    participant U as CreateMeetingUseCase
    participant Repo as ZoomMeetingRepo
    participant Z as Zoom API

    F->>V: POST /api/meetings { topic, date, time }
    V->>V: Joi validation

    alt Invalid input
        V-->>F: 400 { error: "..." }
    else Valid
        V->>C: create(req, res)
        C->>U: execute(meetingData)
        U->>U: check startTime not in past
        U->>Repo: create(meetingData)
        Repo->>Z: POST /users/me/meetings
        Z-->>Repo: meeting data
        Repo->>Repo: invalidate cache
        Repo-->>U: Meeting entity
        U-->>C: Meeting entity
        C-->>F: 201 { success: true, data: {...} }
    end
```

---

### Sequence Diagram — Delete Meeting

```mermaid
sequenceDiagram
    participant F as Frontend (React)
    participant V as Validate Middleware
    participant C as Controller
    participant U as DeleteMeetingUseCase
    participant Repo as ZoomMeetingRepo
    participant Z as Zoom API

    F->>V: DELETE /api/meetings/:id
    V->>V: validate ID is numeric

    alt Invalid ID
        V-->>F: 400 { error: "Invalid meeting ID" }
    else Valid ID
        V->>C: remove(req, res)
        C->>U: execute(id)
        U->>Repo: delete(id)
        Repo->>Z: DELETE /meetings/:id

        alt Meeting exists
            Z-->>Repo: 204 No Content
            Repo->>Repo: invalidate cache
            Repo-->>U: { alreadyDeleted: false }
        else Already deleted (404)
            Z-->>Repo: 404 Not Found
            Repo->>Repo: invalidate cache
            Repo-->>U: { alreadyDeleted: true }
        end

        U-->>C: result
        C-->>F: { success: true, alreadyDeleted: ... }
    end
```

---

### Class Diagram

```mermaid
classDiagram
    class Meeting {
        +id
        +topic
        +startTime
        +duration
        +timezone
        +joinUrl
        +createdAt
    }

    class MeetingRepository {
        <<interface>>
        +findAll()
        +create(meetingData)
        +delete(id)
    }

    class ZoomMeetingRepository {
        +findAll()
        +create(meetingData)
        +delete(id)
    }

    class ListMeetingsUseCase {
        -meetingRepository
        +execute()
    }

    class CreateMeetingUseCase {
        -meetingRepository
        +execute(meetingData)
    }

    class DeleteMeetingUseCase {
        -meetingRepository
        +execute(id)
    }

    class MeetingController {
        -listMeetingsUseCase
        -createMeetingUseCase
        -deleteMeetingUseCase
        +list(req, res)
        +create(req, res)
        +remove(req, res)
    }

    MeetingRepository <|-- ZoomMeetingRepository : implements
    ZoomMeetingRepository ..> Meeting : creates
    ListMeetingsUseCase --> MeetingRepository : uses
    CreateMeetingUseCase --> MeetingRepository : uses
    DeleteMeetingUseCase --> MeetingRepository : uses
    MeetingController --> ListMeetingsUseCase : uses
    MeetingController --> CreateMeetingUseCase : uses
    MeetingController --> DeleteMeetingUseCase : uses
```

---

## Prerequisites

- Node.js v18+
- A Zoom account — [zoom.us](https://zoom.us)

---

## Zoom App Setup

1. Go to [marketplace.zoom.us](https://marketplace.zoom.us) → **Develop → Build App**
2. Choose **Server-to-Server OAuth** → Create
3. Under **Scopes**, add:
   - `meeting:read:list_meetings:master`
   - `meeting:write:meeting:master`
   - `meeting:delete:meeting:master`
4. Click **Activate**
5. Copy your `Account ID`, `Client ID`, and `Client Secret`

---

## Getting Started

### 1. Configure environment

```bash
cd server
cp .env.example .env
```

Fill in your Zoom credentials in `.env`:

```env
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
```

### 2. Install dependencies

```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 3. Run the app

Open two terminals:

```bash
# Terminal 1 — Backend (http://localhost:3001)
cd server && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd client && npm run dev
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/meetings` | List upcoming meetings |
| `POST` | `/api/meetings` | Create a meeting |
| `DELETE` | `/api/meetings/:id` | Delete a meeting |
| `GET` | `/health` | Server health check |

**POST `/api/meetings` body:**
```json
{
  "topic": "Sprint Planning",
  "date": "2026-04-01",
  "time": "10:00",
  "duration": 60
}
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ZOOM_ACCOUNT_ID` | Zoom account ID | required |
| `ZOOM_CLIENT_ID` | Zoom client ID | required |
| `ZOOM_CLIENT_SECRET` | Zoom client secret | required |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |

---

## Common Issues

**Missing environment variables** → Make sure `.env` exists in `/server` with all 3 Zoom values.

**401 Unauthorized** → Confirm your Zoom app is **Activated**, not just created.

**403 Forbidden** → Check that all 3 scopes are added in the Zoom app settings.

**Frontend can't connect** → Make sure the backend is running on port 3001 first.