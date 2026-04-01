import { formatDuration } from "../services/time.js";

export class ElevatorUI {
  constructor(config) {
    this.config = config;
    this.buildingElement = document.getElementById("building");
    this.elevatorElements = new Map();
    this.indicatorElements = new Map();
    this.buttonElements = new Map();
    this.timeElements = new Map();
    this.emergencyButton = document.getElementById("emergencyButton");
    this.emergencyTimer = document.getElementById("emergencyTimer");
    this.clearQueueButton = document.getElementById("clearQueueButton");
    this.resetElevatorsButton = document.getElementById("resetElevatorsButton");
    this.activeMoves = new Map();
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

      const indicator = element.querySelector(".elevator__indicator");
      if (indicator) {
        this.indicatorElements.set(elevatorId, indicator);
      }
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

  bindElevatorClick(onToggleService) {
    this.elevatorElements.forEach((element, elevatorId) => {
      element.addEventListener("click", () => onToggleService(elevatorId));
    });
  }

  bindEmergencyButton(onEmergency) {
    if (!this.emergencyButton) {
      return;
    }

    this.emergencyButton.addEventListener("click", () => onEmergency());
  }

  bindClearQueueButton(onClearQueue) {
    if (!this.clearQueueButton) {
      return;
    }

    this.clearQueueButton.addEventListener("click", () => onClearQueue());
  }

  bindResetElevatorsButton(onReset) {
    if (!this.resetElevatorsButton) {
      return;
    }

    this.resetElevatorsButton.addEventListener("click", () => onReset());
  }

  setClearQueueEnabled(enabled) {
    if (!this.clearQueueButton) {
      return;
    }

    this.clearQueueButton.disabled = !enabled;
  }

  setResetElevatorsEnabled(enabled) {
    if (!this.resetElevatorsButton) {
      return;
    }

    this.resetElevatorsButton.disabled = !enabled;
  }

  setEmergencyEnabled(enabled) {
    if (!this.emergencyButton) {
      return;
    }

    this.emergencyButton.disabled = !enabled;
  }

  setEmergencyTimer(secondsLeft) {
    if (!this.emergencyTimer) {
      return;
    }

    if (!secondsLeft) {
      this.emergencyTimer.textContent = "";
      return;
    }

    this.emergencyTimer.textContent = `${secondsLeft}s`;
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

  setButtonArrivedText(floor, text) {
    const timeElement = this.getTimeElement(floor);
    if (timeElement) {
      timeElement.textContent = text || "";
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

  setElevatorDirection(elevatorId, direction) {
    const indicator = this.indicatorElements.get(elevatorId);
    if (!indicator) {
      return;
    }

    if (direction === "up") {
      indicator.textContent = "▲";
      return;
    }

    if (direction === "down") {
      indicator.textContent = "▼";
      return;
    }

    indicator.textContent = "●";
  }

  async moveElevatorToFloor(elevatorId, floor, durationMs) {
    const elevator = this.elevatorElements.get(elevatorId);
    if (!elevator) {
      return;
    }

    elevator.style.transitionDuration = `${durationMs}ms, 160ms`;
    elevator.style.bottom = `${this.getElevatorBottomPx(floor)}px`;

    await new Promise((resolve, reject) => {
      const timerId = setTimeout(() => {
        this.activeMoves.delete(elevatorId);
        resolve();
      }, durationMs);

      this.activeMoves.set(elevatorId, { timerId, resolve, reject });
    });
  }

  freezeElevator(elevatorId) {
    const elevator = this.elevatorElements.get(elevatorId);
    if (!elevator) {
      return null;
    }

    const computed = window.getComputedStyle(elevator);
    const bottomPx = Number.parseFloat(computed.bottom) || 0;
    elevator.style.transitionDuration = "0ms, 160ms";
    elevator.style.bottom = `${bottomPx}px`;
    return bottomPx;
  }

  snapElevatorToNearestFloor(elevatorId) {
    const bottomPx = this.getElevatorBottomPxNow(elevatorId);
    const centeredOffset = (this.config.floorHeightPx - this.config.elevatorHeightPx) / 2;
    const approxFloor = (bottomPx - centeredOffset) / this.config.floorHeightPx;
    const nearestFloor = Math.max(0, Math.min(this.config.floorsCount - 1, Math.round(approxFloor)));
    const snappedBottom = this.getElevatorBottomPx(nearestFloor);

    const elevator = this.elevatorElements.get(elevatorId);
    if (elevator) {
      elevator.style.transitionDuration = "0ms, 160ms";
      elevator.style.bottom = `${snappedBottom}px`;
    }

    return nearestFloor;
  }

  cancelMove(elevatorId) {
    const active = this.activeMoves.get(elevatorId);
    if (!active) {
      return;
    }

    clearTimeout(active.timerId);
    this.activeMoves.delete(elevatorId);
    active.reject(new Error("MOVE_CANCELLED"));
  }

  cancelAllMoves() {
    this.activeMoves.forEach((_, elevatorId) => {
      this.cancelMove(elevatorId);
    });
  }

  getElevatorBottomPxNow(elevatorId) {
    const elevator = this.elevatorElements.get(elevatorId);
    if (!elevator) {
      return 0;
    }

    const computed = window.getComputedStyle(elevator);
    return Number.parseFloat(computed.bottom) || 0;
  }

  setElevatorClass(elevatorId, stateClass) {
    const elevator = this.elevatorElements.get(elevatorId);
    if (!elevator) {
      return;
    }

    elevator.classList.remove("elevator--moving", "elevator--arrived", "elevator--idle");
    elevator.classList.add(stateClass);
  }

  setElevatorOutOfService(elevatorId, isOutOfService) {
    const elevator = this.elevatorElements.get(elevatorId);
    if (!elevator) {
      return;
    }

    elevator.classList.toggle("elevator--service", isOutOfService);
  }

  setElevatorFloorInstant(elevatorId, floor) {
    const elevator = this.elevatorElements.get(elevatorId);
    if (!elevator) {
      return;
    }

    elevator.style.transitionDuration = "0ms, 160ms";
    elevator.style.bottom = `${this.getElevatorBottomPx(floor)}px`;
  }

  setElevatorBottomInstant(elevatorId, bottomPx) {
    const elevator = this.elevatorElements.get(elevatorId);
    if (!elevator) {
      return;
    }

    elevator.style.transitionDuration = "0ms, 160ms";
    elevator.style.bottom = `${bottomPx}px`;
  }

  getButtonsSnapshot() {
    const snapshot = {};

    this.buttonElements.forEach((button, floor) => {
      let state = "call";
      if (button.classList.contains("call-button--waiting")) {
        state = "waiting";
      } else if (button.classList.contains("call-button--arrived")) {
        state = "arrived";
      }

      const timeElement = this.getTimeElement(floor);
      snapshot[floor] = {
        state,
        timeText: timeElement ? timeElement.textContent : "",
      };
    });

    return snapshot;
  }

  applyButtonsSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      return;
    }

    Object.keys(snapshot).forEach((floorKey) => {
      const floor = Number(floorKey);
      const item = snapshot[floorKey];
      if (!item) {
        return;
      }

      if (item.state === "waiting") {
        this.setButtonWaiting(floor);
        return;
      }

      if (item.state === "arrived") {
        const button = this.buttonElements.get(floor);
        if (button) {
          button.disabled = true;
          button.textContent = "Arrived";
          button.classList.remove("call-button--waiting");
          button.classList.add("call-button--arrived");
        }
        this.setButtonArrivedText(floor, item.timeText);
        return;
      }

      this.resetButton(floor);
      this.setButtonArrivedText(floor, "");
    });
  }

  getElevatorBottomPx(floor) {
    return floor * this.config.floorHeightPx + (this.config.floorHeightPx - this.config.elevatorHeightPx) / 2;
  }

  getTimeElement(floor) {
    return this.timeElements.get(floor) ?? null;
  }
}
