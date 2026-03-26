import { formatDuration } from "../services/time.js";

export class ElevatorUI {
  constructor(config) {
    this.config = config;
    this.buildingElement = document.getElementById("building");
    this.elevatorElements = new Map();
    this.buttonElements = new Map();
    this.timeElements = new Map();
  }

  initialize(onCallFloor) {
    this.cacheElements();
    this.sizeBuildingToMatchElevators();
    this.positionElevatorsAtGroundFloor();
    this.bindCallButtons(onCallFloor);
  }

  sizeBuildingToMatchElevators() {
    const widthPx = this.config.shaftWidthPx * this.config.elevatorsCount;
    this.buildingElement.style.width = `${widthPx}px`;
  }

  cacheElements() {
    const elevatorNodes = this.buildingElement.querySelectorAll(".elevator");
    elevatorNodes.forEach((element) => {
      const elevatorId = Number(element.dataset.elevatorId);
      this.elevatorElements.set(elevatorId, element);
    });

    const buttonNodes = document.querySelectorAll(".call-button");
    buttonNodes.forEach((button) => {
      const floor = Number(button.dataset.floor);
      this.buttonElements.set(floor, button);
    });

    const timeNodes = document.querySelectorAll(".call-button__time");
    timeNodes.forEach((timeElement) => {
      const floor = Number(timeElement.dataset.floorTime);
      this.timeElements.set(floor, timeElement);
    });
  }

  bindCallButtons(onCallFloor) {
    this.buttonElements.forEach((button, floor) => {
      button.addEventListener("click", () => onCallFloor(floor));
    });
  }

  positionElevatorsAtGroundFloor() {
    this.elevatorElements.forEach((element, elevatorId) => {
      const left =
        elevatorId * this.config.shaftWidthPx +
        (this.config.shaftWidthPx - element.offsetWidth) / 2;

      element.style.left = `${left}px`;
      element.style.bottom = `${this.getElevatorBottomPx(0)}px`;
    });
  }

  setButtonWaiting(floor) {
    const button = this.buttonElements.get(floor);
    if (!button) {
      return;
    }

    button.disabled = true;
    button.textContent = "Waiting";
    button.classList.remove("call-button--arrived");
    button.classList.add("call-button--waiting");
  }

  setButtonArrived(floor, travelTimeMs) {
    const button = this.buttonElements.get(floor);
    if (!button) {
      return;
    }

    button.textContent = "Arrived";
    button.classList.remove("call-button--waiting");
    button.classList.add("call-button--arrived");

    const timeElement = this.getTimeElement(floor);
    if (timeElement) {
      timeElement.textContent = formatDuration(travelTimeMs);
    }
  }

  resetButton(floor) {
    const button = this.buttonElements.get(floor);
    if (!button) {
      return;
    }

    button.disabled = false;
    button.textContent = "Call";
    button.classList.remove("call-button--waiting", "call-button--arrived");

    const timeElement = this.getTimeElement(floor);
    if (timeElement) {
      timeElement.textContent = "";
    }
  }

  setElevatorMoving(elevatorId) {
    this.setElevatorClass(elevatorId, "elevator--moving");
  }

  setElevatorArrived(elevatorId) {
    this.setElevatorClass(elevatorId, "elevator--arrived");
  }

  setElevatorIdle(elevatorId) {
    this.setElevatorClass(elevatorId, "elevator--idle");
  }

  async moveElevatorToFloor(elevatorId, floor, durationMs) {
    const elevator = this.elevatorElements.get(elevatorId);
    if (!elevator) {
      return;
    }

    elevator.style.transitionDuration = `${durationMs}ms, 160ms`;
    elevator.style.bottom = `${this.getElevatorBottomPx(floor)}px`;

    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  setElevatorClass(elevatorId, stateClass) {
    const elevator = this.elevatorElements.get(elevatorId);
    if (!elevator) {
      return;
    }

    elevator.classList.remove("elevator--moving", "elevator--arrived", "elevator--idle");
    elevator.classList.add(stateClass);
  }

  getElevatorBottomPx(floor) {
    return floor * this.config.floorHeightPx + (this.config.floorHeightPx - this.config.elevatorHeightPx) / 2;
  }

  getTimeElement(floor) {
    return this.timeElements.get(floor) ?? null;
  }
}
