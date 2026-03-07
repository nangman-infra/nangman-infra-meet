# DDD Migration Responsibility Map

This document defines the migration baseline for moving Element Call toward a
domain-driven design without changing current behavior, UI, or UX.

## Scope

This is a structural refactor only.

The following must remain behaviorally stable during the first migration waves:

- Current routes and navigation behavior
- Current URL parameter contract
- Current widget actions and preload flow
- Current MatrixRTC and LiveKit join/leave behavior
- Current device mute and screen sharing behavior
- Current settings keys and local storage behavior
- Current analytics, Sentry, and OpenTelemetry integration points
- Current room loading, knock, and invite flows

## Non-goals

The migration does not try to:

- rewrite the app from RxJS to another state model
- redesign UI components
- change product behavior
- swap Matrix or LiveKit SDKs
- force "pure DDD" where browser and SDK constraints make that artificial

## Problem Statement

The current codebase already contains identifiable business contexts, but the
boundaries between domain logic, orchestration, SDK integration, and React UI
are blurred.

The main structural issues are:

- application flow, domain rules, and infrastructure code are mixed in the same
  files
- Matrix SDK, LiveKit SDK, browser APIs, and widget APIs leak deep into
  call-related logic
- some files act as both use-case coordinators and low-level adapters
- React components still own parts of flow control that should live elsewhere

The goal is to separate:

- domain rules
- application use-cases
- infrastructure adapters
- presentation adapters

## Bounded Contexts

### 1. Call

Owns:

- call lifecycle
- joining and leaving
- call pickup and auto-leave decisions
- participant counting
- tile and layout decisions
- call reactions and raised hands
- reconnecting semantics

Current anchors:

- `src/state/CallViewModel/CallViewModel.ts`
- `src/state/CallViewModel/CallNotificationLifecycle.ts`
- `src/state/CallViewModel/localMember/LocalMembership.ts`
- `src/state/CallViewModel/localMember/LocalTransport.ts`
- `src/state/CallViewModel/remoteMembers/*`

### 2. Room

Owns:

- room identification from URL
- room lookup and join strategy
- alias resolution
- knock/invite/public-join decision flow
- room readiness before MatrixRTC use

Current anchors:

- `src/room/useLoadGroupCall.ts`
- `src/room/RoomPage.tsx`
- `src/UrlParams.ts`

### 3. Media

Owns:

- device discovery and selection
- mute state behavior
- local track setup
- audio output routing
- background processor setup

Current anchors:

- `src/state/MediaDevices.ts`
- `src/state/MuteStates.ts`
- `src/livekit/TrackProcessorContext.tsx`
- `src/state/CallViewModel/localMember/Publisher.ts`

### 4. Auth and Session

Owns:

- session restore
- standalone Matrix client bootstrapping
- SSO login completion
- logout
- passwordless user state

Current anchors:

- `src/ClientContext.tsx`
- `src/utils/spa.ts`
- `src/auth/useSSOLogin.ts`
- `src/utils/matrix.ts`

### 5. Widget Embedding

Owns:

- widget detection
- capability requests
- host action bridge
- preload and join handoff
- device mute synchronization with host

Current anchors:

- `src/widget.ts`
- `src/ClientContext.tsx`
- `src/state/MuteStates.ts`
- `src/room/GroupCallView.tsx`

### 6. Settings and Telemetry

Owns:

- server config loading
- local user settings
- analytics opt-in and tracking
- Sentry and OpenTelemetry bootstrap

Current anchors:

- `src/config/Config.ts`
- `src/settings/settings.ts`
- `src/analytics/PosthogAnalytics.ts`
- `src/initializer.tsx`
- `src/otel/otel.ts`

## Current Responsibility Map

| File | Current responsibilities | Problem | Target destination |
| --- | --- | --- | --- |
| `src/state/CallViewModel/CallViewModel.ts` | call orchestration, layout logic, membership composition, reaction handling, widget hangup handling, connection state shaping | domain, application, and infrastructure concerns are mixed | split into `domains/call/application`, `domains/call/domain`, and adapter-facing presenters |
| `src/state/CallViewModel/localMember/LocalMembership.ts` | local join flow, connection state machine, screen sharing, publisher lifecycle, widget side effects, Matrix session updates | local participant lifecycle and infrastructure side effects are tightly coupled | keep lifecycle policy in application layer, move SDK and widget interaction behind ports |
| `src/state/CallViewModel/localMember/LocalTransport.ts` | transport discovery from dev setting, `.well-known`, config, OpenID-backed SFU priming | transport policy and infrastructure fetches are mixed | split into transport selection policy + transport discovery adapter |
| `src/state/CallViewModel/remoteMembers/Connection.ts` | OpenID token flow, SFU config fetch, LiveKit room connection, remote participant observation | infrastructure adapter exposed directly into call logic | move under infrastructure as a LiveKit transport adapter |
| `src/state/CallViewModel/remoteMembers/MatrixLivekitMembers.ts` | correlate Matrix memberships with LiveKit participants | correct context, but depends on infrastructure types directly | keep in Call context, but consume ports instead of SDK types where possible |
| `src/room/useLoadGroupCall.ts` | room join decision logic, knock flow, invite retry, room readiness | room application flow lives in a React hook | extract to room use-cases and keep hook as presentation adapter |
| `src/room/GroupCallView.tsx` | lobby skipping, preload join, error bridging, room-derived view state, widget join handling | UI component still coordinates use-cases | keep rendering here, move lifecycle flow to application services |
| `src/room/InCallView.tsx` | render tree, keyboard shortcuts, overlay logic, settings modal orchestration, widget layout sync, call VM composition | presentation and workflow glue are mixed | leave rendering, move orchestration into presentation adapters and use-cases |
| `src/ClientContext.tsx` | client bootstrapping, session persistence, auth state, widget mode branching, feature detection | auth/session and infrastructure bootstrapping are mixed with React provider concerns | split into auth application services + session infrastructure + thin provider |
| `src/widget.ts` | widget API bootstrap, capability wiring, room widget client creation, lazy action routing | pure infrastructure but currently acts as a global singleton | keep infrastructure responsibility, wrap with an explicit widget host port |
| `src/state/MediaDevices.ts` | browser device observation, audio routing policy, iOS special handling | domain policy and browser API handling are mixed | split into media policy + browser media adapter |
| `src/state/MuteStates.ts` | mute defaults, toggle flow, handler dispatch, widget synchronization | mute policy and host synchronization are mixed | keep mute rules in media application layer, move widget sync to adapter |
| `src/UrlParams.ts` | URL parsing, intent defaults, widget mode detection, call-room identity | multiple contexts depend on a large shared parser | split read models by context: room intent, widget host config, UI config |
| `src/config/Config.ts` | config loading and default config access | acceptable, but global static access spreads config concerns | move static singleton behind a config port later |

## Target Layering

The target is not a rigid textbook DDD shape. It is a practical layering model
for a browser RTC app.

### Domain

Contains:

- entities
- value objects
- domain services
- domain policies
- domain events

Should not directly depend on:

- React
- Matrix SDK
- LiveKit SDK
- browser APIs
- widget APIs

### Application

Contains:

- use-cases
- orchestration
- transaction boundaries across ports
- state transition coordination

Can depend on:

- domain
- ports
- mappers

Should not directly depend on:

- React components
- concrete SDK clients

### Infrastructure

Contains:

- Matrix SDK adapters
- LiveKit adapters
- browser media adapters
- widget host adapters
- local storage adapters
- telemetry adapters

### Presentation

Contains:

- React components
- hooks
- view-model adapters
- mapping between application outputs and UI props

## Proposed Folder Structure

```text
src/
  domains/
    call/
      domain/
      application/
      infrastructure/
      presentation/
    room/
      domain/
      application/
      infrastructure/
      presentation/
    media/
      domain/
      application/
      infrastructure/
      presentation/
    auth/
      domain/
      application/
      infrastructure/
      presentation/
    widget/
      application/
      infrastructure/
    settings/
      domain/
      application/
      infrastructure/
      presentation/
  shared/
    domain/
    application/
    infrastructure/
    presentation/
```

## Required Ports

These ports should exist before large file moves begin.

### Call context

- `RtcSessionPort`
- `MembershipRepository`
- `CallNotificationPort`
- `TransportSelectionPort`
- `ConnectionPort`
- `ParticipantPresencePort`

### Room context

- `RoomDirectoryPort`
- `RoomJoinPort`
- `RoomSummaryPort`
- `RoomReadinessPort`

### Media context

- `MediaDevicePort`
- `AudioOutputPort`
- `LocalTrackPort`
- `ScreenSharePort`
- `BackgroundProcessorPort`

### Auth context

- `SessionStorePort`
- `MatrixClientFactoryPort`
- `SsoAuthPort`

### Widget context

- `WidgetHostPort`
- `WidgetClientPort`

### Settings and telemetry

- `ConfigPort`
- `UserSettingsPort`
- `AnalyticsPort`
- `CrashReportingPort`
- `TracingPort`

## Phase Rules

Each migration phase must obey these rules:

- no UI redesign
- no route changes
- no URL contract changes
- no widget action contract changes
- no local storage key changes without a compatibility layer
- no direct delete-and-rewrite of a large feature area
- keep old tests passing while adding boundary tests around extracted modules

## Migration Order

### Phase 0. Freeze external contracts

Capture and preserve:

- routes
- URL params
- widget actions
- config keys
- settings keys
- call lifecycle semantics

### Phase 1. Introduce ports and anti-corruption boundaries

Start with:

- Call transport discovery
- connection bootstrap
- widget host bridge
- session store

This phase should not move UI files yet.

### Phase 2. Split Call application layer

Extract from `CallViewModel.ts`:

- call lifecycle policy
- layout decision policy
- participant aggregation policy
- auto-leave and pickup policy

Keep the current observable composition as an adapter if needed.

### Phase 3. Split Room application layer

Extract from `useLoadGroupCall.ts` and `RoomPage.tsx`:

- room resolution
- join strategy
- knock and invite handling
- room readiness flow

### Phase 4. Split Media application layer

Extract from `MediaDevices.ts`, `MuteStates.ts`, and local publisher logic:

- mute defaults
- device selection policy
- audio output switching policy
- screen share state policy

### Phase 5. Split Auth and Widget contexts

Extract from `ClientContext.tsx` and `widget.ts`:

- session restore use-case
- standalone client bootstrap use-case
- widget host bootstrap adapter
- widget client adapter

### Phase 6. Thin presentation layer

After the above, make:

- `GroupCallView.tsx`
- `InCallView.tsx`
- `RoomPage.tsx`

into presentation-focused adapters only.

## First Refactor Targets

These are the first files to refactor, in order:

1. `src/state/CallViewModel/localMember/LocalTransport.ts`
2. `src/state/CallViewModel/remoteMembers/Connection.ts`
3. `src/widget.ts`
4. `src/ClientContext.tsx`
5. `src/state/CallViewModel/CallNotificationLifecycle.ts`
6. `src/room/useLoadGroupCall.ts`
7. `src/state/CallViewModel/CallViewModel.ts`

Rationale:

- these files define the main boundaries to external systems
- extracting them first reduces future coupling
- `CallViewModel.ts` should be split only after its dependencies are behind
  ports

## Definition of Done for the Structural Migration

The migration is structurally successful when:

- the main contexts are explicit in the folder structure
- application services do not import concrete Matrix or LiveKit SDK types
- React components no longer own room join or call lifecycle orchestration
- widget integration is isolated behind an adapter
- config and local settings are consumed through ports
- current UI behavior remains unchanged

## Immediate Next Step

Do not start by moving `InCallView.tsx`.

Start by introducing explicit ports for:

- transport discovery
- LiveKit connection bootstrap
- widget host actions
- session persistence

Those boundaries will determine whether the later DDD migration is real or
just a folder rename.
