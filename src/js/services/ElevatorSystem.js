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
    this.emergencyActive = false;
    this.pausedTrips = new Map();
    this.persistence = null;
  }

  initialize() {
    this.ui.initialize((floor) => this.handleCall(floor));
    this.ui.bindElevatorClick((elevatorId) => this.toggleOutOfService(elevatorId));
    this.ui.bindEmergencyButton(() => this.triggerEmergency());
    this.ui.bindClearQueueButton(() => this.clearQueue());
    this.ui.bindResetElevatorsButton(() => this.resetElevators());
  }

  toggleOutOfService(elevatorId) {
    const elevator = this.elevators.find((e) => e.id === elevatorId);
    if (!elevator) {
      return;
    }

    if (!elevator.inService) {
      elevator.inService = true;
      elevator.pendingOutOfService = false;
      this.ui.setElevatorOutOfService(elevator.id, false);
      this.dispatch();
      return;
    }

    if (!elevator.isIdle()) {
      elevator.pendingOutOfService = true;
      return;
    }

    elevator.inService = false;
    this.ui.setElevatorOutOfService(elevator.id, true);
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
    if (this.emergencyActive) {
      return;
    }

    if (this.pendingRequests.length === 0) {
      return;
    }

    const idleElevators = this.elevators.filter(
      (elevator) => elevator.isIdle() && elevator.isInService(),
    );
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
    elevator.activeRequest = request;
    this.ui.setElevatorMoving(elevator.id);
    this.ui.setElevatorDirection(elevator.id, elevator.direction);

    const travelDistance = elevator.distanceTo(request.floor);
    const durationMs = travelDistance * this.config.travelTimePerFloorMs;

    try {
      await this.ui.moveElevatorToFloor(elevator.id, request.floor, durationMs);
    } catch (error) {
      if (String(error?.message) !== "MOVE_CANCELLED") {
        throw error;
      }

      // Emergency can interrupt a trip. We store the trip and wait.
      this.pausedTrips.set(elevator.id, request);
      await this.waitForEmergencyToEnd();

      const bottomNow = this.ui.getElevatorBottomPxNow(elevator.id);
      const targetBottom = this.ui.getElevatorBottomPx(request.floor);
      const remainingPx = Math.abs(targetBottom - bottomNow);
      const remainingFloors = remainingPx / this.config.floorHeightPx;
      const remainingMs = Math.max(0, Math.round(remainingFloors * this.config.travelTimePerFloorMs));

      await this.ui.moveElevatorToFloor(elevator.id, request.floor, remainingMs);
      this.pausedTrips.delete(elevator.id);
    }

    const elapsedMs = performance.now() - request.createdAt;

    this.audioService.beep();
    elevator.markArrived(request.floor);
    this.ui.setElevatorArrived(elevator.id);
    this.ui.setElevatorDirection(elevator.id, "idle");
    this.ui.setButtonArrived(request.floor, elapsedMs);

    await sleep(this.config.doorWaitMs);

    elevator.markIdle();
    this.ui.setElevatorIdle(elevator.id);
    this.ui.setElevatorDirection(elevator.id, "idle");
    this.ui.resetButton(request.floor);
    this.queuedFloors.delete(request.floor);

    if (elevator.pendingOutOfService) {
      elevator.pendingOutOfService = false;
      elevator.inService = false;
      this.ui.setElevatorOutOfService(elevator.id, true);
    }

    this.dispatch();
  }

  triggerEmergency() {
    if (this.emergencyActive) {
      return;
    }

    this.emergencyActive = true;
    this.ui.setEmergencyEnabled(false);
    this.ui.setEmergencyTimer(10);

    // Stop animations right now.
    this.ui.cancelAllMoves();
    this.elevators.forEach((elevator) => {
      this.ui.freezeElevator(elevator.id);
      const snappedFloor = this.ui.snapElevatorToNearestFloor(elevator.id);
      elevator.currentFloor = snappedFloor;
      this.ui.setElevatorDirection(elevator.id, "idle");
    });

    const inService = this.elevators.filter((e) => e.isInService());
    const candidates = inService.length > 0 ? inService : this.elevators;
    const nearestToGround = candidates.reduce((best, current) => {
      if (!best) {
        return current;
      }

      const bestBottom = this.ui.getElevatorBottomPxNow(best.id);
      const currentBottom = this.ui.getElevatorBottomPxNow(current.id);
      return currentBottom < bestBottom ? current : best;
    }, null);

    if (nearestToGround) {
      void this.sendToGround(nearestToGround);
    }

    // After 10 seconds resume normal work.
    void (async () => {
      for (let secondsLeft = 9; secondsLeft >= 0; secondsLeft -= 1) {
        await sleep(1_000);
        this.ui.setEmergencyTimer(secondsLeft);
      }

      this.emergencyActive = false;
      this.ui.setEmergencyEnabled(true);
      this.dispatch();
    })();
  }

  clearQueue() {
    // Do not touch elevators already on their way; clear only pending work + UI.
    this.pendingRequests = [];
    this.queuedFloors.clear();

    for (let floor = 0; floor < this.config.floorsCount; floor += 1) {
      this.ui.resetButton(floor);
    }

    // Make sure refresh won't bring the old queue back.
    if (this.persistence) {
      this.persistence.clear();
      this.persistence.save();
    }
  }

  resetElevators() {
    if (this.emergencyActive) {
      return;
    }

    this.ui.setResetElevatorsEnabled(false);

    // Interrupt current moves. If an elevator was serving a request, put it back in the queue.
    this.ui.cancelAllMoves();
    this.elevators.forEach((elevator) => {
      if (elevator.activeRequest) {
        this.pendingRequests.push(elevator.activeRequest);
        this.queuedFloors.add(elevator.activeRequest.floor);
        elevator.activeRequest = null;
      }

      this.ui.freezeElevator(elevator.id);
    });

    void (async () => {
      const moves = this.elevators.map(async (elevator) => {
        const bottomNow = this.ui.getElevatorBottomPxNow(elevator.id);
        const targetBottom = this.ui.getElevatorBottomPx(0);
        const remainingPx = Math.abs(targetBottom - bottomNow);
        const remainingFloors = remainingPx / this.config.floorHeightPx;
        const durationMs = Math.max(0, Math.round(remainingFloors * 500));

        elevator.markMoving(0);
        this.ui.setElevatorMoving(elevator.id);
        this.ui.setElevatorDirection(elevator.id, elevator.direction);

        await this.ui.moveElevatorToFloor(elevator.id, 0, durationMs);

        elevator.markArrived(0);
        this.ui.setElevatorArrived(elevator.id);
        this.ui.setElevatorDirection(elevator.id, "idle");

        await sleep(250);

        elevator.markIdle();
        this.ui.setElevatorIdle(elevator.id);
        this.ui.setElevatorDirection(elevator.id, "idle");
      });

      await Promise.allSettled(moves);

      this.ui.setResetElevatorsEnabled(true);
      if (this.persistence) {
        this.persistence.save();
      }
      this.dispatch();
    })();
  }

  async sendToGround(elevator) {
    const bottomNow = this.ui.getElevatorBottomPxNow(elevator.id);
    const targetBottom = this.ui.getElevatorBottomPx(0);
    const remainingPx = Math.abs(targetBottom - bottomNow);
    const remainingFloors = remainingPx / this.config.floorHeightPx;
    const durationMs = Math.max(0, Math.round(remainingFloors * 350));

    elevator.markMoving(0);
    this.ui.setElevatorMoving(elevator.id);
    this.ui.setElevatorDirection(elevator.id, elevator.direction);
    await this.ui.moveElevatorToFloor(elevator.id, 0, durationMs);
    elevator.markArrived(0);
    this.ui.setElevatorArrived(elevator.id);
    this.ui.setElevatorDirection(elevator.id, "idle");
    await sleep(400);
    elevator.markIdle();
    this.ui.setElevatorIdle(elevator.id);
  }

  waitForEmergencyToEnd() {
    if (!this.emergencyActive) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (!this.emergencyActive) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  }
}
