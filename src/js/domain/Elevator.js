import { ElevatorState } from "./ElevatorState.js";

// Represents a single elevator in the building.
export class Elevator {
  constructor(id, initialFloor = 0) {
    // 0..4 based on markup.
    this.id = id;
    this.currentFloor = initialFloor;
    this.state = ElevatorState.IDLE;
    // Not required for the current UI, but useful for future enhancements.
    this.currentTargetFloor = null;
  }

  isIdle() {
    return this.state === ElevatorState.IDLE;
  }

  distanceTo(floor) {
    // "Distance" is number of floors we need to travel.
    return Math.abs(this.currentFloor - floor);
  }

  markMoving(targetFloor) {
    this.state = ElevatorState.MOVING;
    this.currentTargetFloor = targetFloor;
  }

  markArrived(targetFloor) {
    this.currentFloor = targetFloor;
    this.state = ElevatorState.ARRIVED;
  }

  markIdle() {
    this.currentTargetFloor = null;
    this.state = ElevatorState.IDLE;
  }
}
