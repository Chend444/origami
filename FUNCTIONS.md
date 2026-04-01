## Function map (purpose)

### `src/js/main.js`
- **`startApp()`**: Creates the main objects (elevators + UI + services) and starts the system by calling `elevatorSystem.initialize()`.

### `src/js/services/ElevatorSystem.js`
- **`initialize()`**: Connects UI events to the controller (`handleCall`) by passing a callback into `ElevatorUI.initialize(...)`.
- **`handleCall(floor)`**: Handles a floor button click. Prevents duplicate waiting calls for the same floor, enqueues the request, updates the button to “Waiting”, then calls `dispatch()`.
- **`dispatch()`**: Assigns queued requests to currently idle elevators. For each assignment it calls `serveRequest(...)`.
- **`serveRequest(elevator, request)`**: Runs the lifecycle of one request: set moving state, animate to target floor, measure time, beep + arrival UI, wait 2 seconds, reset states, then calls `dispatch()` again.

### `src/js/ui/ElevatorUI.js`
- **`initialize(onCallFloor)`**: Caches DOM nodes, sizes the building area, positions elevators initially, and binds button click handlers to call `onCallFloor(floor)`.
- **`cacheElements()`**: Finds elevator elements, buttons, and time labels and stores them for quick access.
- **`sizeBuildingToMatchElevators()`**: Sets the building width so the grid fits `elevatorsCount` shafts.
- **`positionElevatorsAtGroundFloor()`**: Places all elevator elements at floor 0 (ground) visually.
- **`bindCallButtons(onCallFloor)`**: On click, calls `onCallFloor(floor)` with the clicked button’s floor.
- **`setButtonWaiting(floor)`**: Button becomes red “Waiting” and is disabled.
- **`setButtonArrived(floor, ms)`**: Button becomes “Arrived” and shows travel time.
- **`resetButton(floor)`**: Button returns to green “Call” and is re-enabled.
- **`setElevatorMoving/Arrived/Idle(id)`**: Updates elevator color by swapping CSS classes.
- **`moveElevatorToFloor(id, floor, durationMs)`**: Animates elevator movement by changing CSS `bottom` with a transition duration.
- **`getElevatorBottomPx(floor)`**: Converts a floor index to a pixel position for the elevator’s `bottom`.

### `src/js/strategies/NearestElevatorPicker.js`
- **`pick(elevators, requestFloor)`**: Returns the closest elevator by floor distance. If equal distance, picks the smaller id (stable result).

### `src/js/domain/Elevator.js`
- **`isIdle()`**: Used by dispatching logic to find available elevators.
- **`distanceTo(floor)`**: Distance in floors; used for picking nearest + calculating travel time.
- **`markMoving(targetFloor)`**: Updates elevator state to moving.
- **`markArrived(targetFloor)`**: Updates current floor and sets state to arrived.
- **`markIdle()`**: Resets state to idle.

### `src/js/services/AudioService.js`
- **`beep()`**: Plays a short beep when an elevator arrives.

### `src/js/services/time.js`
- **`sleep(ms)`**: Promise-based delay (used for the 2-second wait).
- **`formatDuration(ms)`**: Formats milliseconds into `X sec` or `Y min Z sec`.

