# Elevator Exercise (Vanilla JS)

Modular elevator simulation for a 10-floor building with 5 elevators.

## Run

Open `index.html` in any modern browser.

## Architecture

- `src/js/domain` - basic models (`Elevator`, `ElevatorState`)
- `src/js/strategies` - elevator picking logic (`NearestElevatorPicker`)
- `src/js/services` - controller + helpers (`ElevatorSystem`, `AudioService`, time helpers)
- `src/js/ui` - DOM + animation (`ElevatorUI`)
- `src/js/config` - constants (`BUILDING_CONFIG`)
- `src/js/main.js` - app entry point

## Design decisions

- Calls are stored in a simple queue, so we don’t lose requests when all elevators are busy.
- The "pick closest elevator" logic is in one file so it’s easy to change during the interview.
- UI updates are kept in `ElevatorUI` so the controller code stays readable.