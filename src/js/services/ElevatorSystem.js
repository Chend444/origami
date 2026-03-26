import { sleep } from "./time.js";

export class ElevatorSystem {
  constructor({ elevators, selector, ui, audioService, config }) {
    this.elevators = elevators;
    this.selector = selector;
    this.ui = ui;
    this.audioService = audioService;
    this.config = config;
    this.pendingRequests = [];
    // While a floor is already waiting, ignore extra clicks on the same floor.
    this.queuedFloors = new Set();
  }

  initialize() {
    this.ui.initialize((floor) => this.handleCall(floor));
  }

  handleCall(floor) {
    if (this.queuedFloors.has(floor)) {
      return;
    }

    this.queuedFloors.add(floor);
    this.pendingRequests.push({ floor, createdAt: performance.now() });
    this.ui.setButtonWaiting(floor);
    this.dispatch();
  }

  dispatch() {
    if (this.pendingRequests.length === 0) {
      return;
    }

    const idleElevators = this.elevators.filter((elevator) => elevator.isIdle());
    if (idleElevators.length === 0) {
      return;
    }

    // If we have multiple idle elevators, assign as many calls as we can.
    // (Simple loop; enough for this exercise.)
    while (this.pendingRequests.length > 0) {
      const request = this.pendingRequests.shift();
      const elevator = this.selector.pick(idleElevators, request.floor);
      if (!elevator) {
        this.pendingRequests.unshift(request);
        return;
      }

      void this.serveRequest(elevator, request);

      // Remove from the idle list so we won't assign two requests to the same elevator.
      const index = idleElevators.findIndex((e) => e.id === elevator.id);
      if (index >= 0) {
        idleElevators.splice(index, 1);
      }

      if (idleElevators.length === 0) {
        return;
      }
    }
  }

  async serveRequest(elevator, request) {
    elevator.markMoving(request.floor);
    this.ui.setElevatorMoving(elevator.id);

    const travelDistance = elevator.distanceTo(request.floor);
    const durationMs = travelDistance * this.config.travelTimePerFloorMs;

    await this.ui.moveElevatorToFloor(elevator.id, request.floor, durationMs);

    const elapsedMs = performance.now() - request.createdAt;

    this.audioService.beep();
    elevator.markArrived(request.floor);
    this.ui.setElevatorArrived(elevator.id);
    this.ui.setButtonArrived(request.floor, elapsedMs);

    await sleep(this.config.doorWaitMs);

    elevator.markIdle();
    this.ui.setElevatorIdle(elevator.id);
    this.ui.resetButton(request.floor);
    this.queuedFloors.delete(request.floor);
    this.dispatch();
  }
}
