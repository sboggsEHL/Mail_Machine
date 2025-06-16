# Modular Implementation Plan: Scalable Duplicate Check System

This document outlines a modular, phase-based implementation plan for a robust, scalable duplicate check system with streaming and advanced logging, tailored for a Node/React stack hosted on DigitalOcean.

---

## Phase 1: Backend SQL Refactor for Duplicate Check

**Goal:** Replace multi-pass duplicate check with a single, efficient SQL query.

**Files & Actions:**
- **`server/services/PropertyRadarListService.ts`**
  - Add a new method, e.g., `checkDuplicatesAll(radarIds: { RadarID: string, AddedDate: string }[]): Promise<DuplicateCheckResult[]>`
    - Implements the single SQL query using `unnest` and `LEFT JOIN` to `complete_property_view`.
    - Ensures case-insensitive radar_id comparison.
    - Returns all input items with `is_duplicate` and property details.
  - Refactor or deprecate the old `checkDuplicates` method.
- **`server/repositories/PropertyRepository.ts`** (if SQL is abstracted here)
  - Add a new repository method for the above query if needed.

---

## Phase 2: API and Job State Refactor

**Goal:** Integrate the new duplicate check into the job flow and persist job state.

**Files & Actions:**
- **`server/controllers/ListController.ts`**
  - Update the endpoint that starts the duplicate check job to use the new `checkDuplicatesAll` method.
  - Accepts the full list of RadarIDs and passes them to the service.
- **`server/services/DuplicateCheckJobService.ts`**
  - Refactor job logic to:
    - Use the new single-query method.
    - For large lists, process in manageable chunks if needed.
    - Store job progress and results in a persistent store (e.g., Postgres or Redis).
    - Expose job status and results via API endpoints.
- **`server/routes/listRoutes.ts`**
  - Ensure the route for duplicate check points to the updated controller logic.

---

## Phase 3: Streaming Results to Frontend

**Goal:** Provide real-time progress and results to the frontend using Server-Sent Events (SSE).

**Files & Actions:**
- **`server/controllers/ListController.ts`**
  - Add a new SSE endpoint, e.g., `GET /api/duplicate-check/stream/:jobId`
    - Streams progress and result chunks as the job runs.
- **`server/services/DuplicateCheckJobService.ts`**
  - As results are processed, push updates to the SSE stream.
  - Ensure job state is recoverable and resumable.
- **`server/routes/listRoutes.ts`**
  - Register the new SSE route.

---

## Phase 4: Advanced Logging and Error Handling

**Goal:** Ensure robust monitoring, debugging, and operational insight.

**Files & Actions:**
- **`server/utils/logger.ts`** (or similar)
  - Integrate or enhance structured logging (e.g., Winston or Pino).
- **All backend service and controller files above**
  - Add logging for job state transitions, errors, and key events (include jobId, user, etc.).
  - Add error handling for all streaming and job operations, with clear error messages for the frontend.
- **DigitalOcean App Platform configuration**
  - Ensure logs are compatible with DO's logging/monitoring stack.

---

## Phase 5: Frontend Integration

**Goal:** Update the React frontend to consume streaming results and display real-time progress.

**Files & Actions:**
- **`src/services/list.service.ts`**
  - Add a function to connect to the SSE endpoint and handle streamed data.
- **`src/pages/ListProcessPage.tsx`**
  - Update to show real-time progress bar and status.
  - Display all list items with `is_duplicate` and property details as they arrive.
  - Handle errors and job restarts gracefully.
- **`src/components/ProcessMultipleListsModal.tsx`** (if used for job UI)
  - Update to reflect new progress and result streaming.

---

## Phase 6: Testing, Optimization, and Rollout

**Goal:** Ensure correctness, performance, and reliability at scale.

**Files & Actions:**
- **Backend test files** (e.g., `server/tests/PropertyRadarListService.test.ts`, `server/tests/ListController.test.ts`)
  - Write integration and load tests for the new backend flows.
- **Frontend test files** (e.g., `src/pages/ListProcessPage.test.tsx`)
  - Test UI updates and error handling.
- **`server/services/PropertyRadarListService.ts`**
  - Profile and optimize SQL queries; add indexes if needed.
- **DigitalOcean App Platform**
  - Monitor memory and CPU usage; tune chunk sizes and streaming intervals.
- **Documentation**
  - Update docs and provide operational runbooks.

---

**Tracking:**  
Each phase is self-contained and can be tracked as a milestone. Deliverables for each phase include code, tests, and documentation updates.

**Streaming Technology Rationale:**  
SSE is recommended for this use case due to its simplicity, built-in reconnect logic, and compatibility with most cloud load balancers (including DO App Platform). It is easier to implement and maintain than WebSockets for unidirectional, progress-style updates.

---

This plan is modular, detailed, and ready for phased implementation and tracking, with explicit file references for each step.