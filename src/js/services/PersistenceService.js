export class PersistenceService {
  constructor({ system, ui, config }) {
    this.system = system;
    this.ui = ui;
    this.config = config;
    this.storageKey = "origami.elevator.v1";
    this.timerId = null;
  }

  start() {
    if (this.timerId) {
      return;
    }

    this.timerId = window.setInterval(() => {
      this.save();
    }, 2000);
  }

  stop() {
    if (!this.timerId) {
      return;
    }

    window.clearInterval(this.timerId);
    this.timerId = null;
  }

  clear() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // ignore
    }
  }

  save() {
    try {
      const now = performance.now();
      const payload = {
        v: 1,
        elevators: this.system.elevators.map((e) => ({
          id: e.id,
          currentFloor: e.currentFloor,
          state: e.state,
          inService: e.inService,
          pendingOutOfService: e.pendingOutOfService,
          direction: e.direction,
          bottomPx: this.ui.getElevatorBottomPxNow(e.id),
          activeRequest: e.activeRequest
            ? {
                floor: e.activeRequest.floor,
                ageMs: Math.max(0, Math.round(now - e.activeRequest.createdAt)),
              }
            : null,
        })),
        queue: this.system.pendingRequests.map((r) => ({
          floor: r.floor,
          ageMs: Math.max(0, Math.round(now - r.createdAt)),
        })),
        queuedFloors: Array.from(this.system.queuedFloors),
        ui: {
          buttons: this.ui.getButtonsSnapshot(),
        },
      };

      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch {
      // ignore persistence errors
    }
  }

  restore() {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return false;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return false;
    }

    if (!data || data.v !== 1) {
      return false;
    }

    if (Array.isArray(data.elevators)) {
      for (const snapshot of data.elevators) {
        const elevator = this.system.elevators.find((e) => e.id === snapshot.id);
        if (!elevator) {
          continue;
        }

        elevator.currentFloor = Number(snapshot.currentFloor) || 0;
        elevator.inService = snapshot.inService !== false;
        elevator.pendingOutOfService = Boolean(snapshot.pendingOutOfService);
        elevator.state = "idle";
        elevator.direction = "idle";

        if (typeof snapshot.bottomPx === "number") {
          this.ui.setElevatorBottomInstant(elevator.id, snapshot.bottomPx);
          const snapped = this.ui.snapElevatorToNearestFloor(elevator.id);
          elevator.currentFloor = snapped;
        } else {
          this.ui.setElevatorFloorInstant(elevator.id, elevator.currentFloor);
        }

        this.ui.setElevatorOutOfService(elevator.id, !elevator.inService);
        this.ui.setElevatorDirection(elevator.id, "idle");
        this.ui.setElevatorIdle(elevator.id);
      }
    }

    this.system.pendingRequests = [];
    if (Array.isArray(data.queue)) {
      const now = performance.now();
      for (const r of data.queue) {
        const floor = Number(r.floor);
        const ageMs = Number(r.ageMs) || 0;
        if (Number.isNaN(floor)) {
          continue;
        }
        this.system.pendingRequests.push({ floor, createdAt: now - ageMs });
      }
    }

    // Re-queue any in-flight calls so elevators continue working after refresh.
    if (Array.isArray(data.elevators)) {
      const now = performance.now();
      for (const snapshot of data.elevators) {
        const ar = snapshot?.activeRequest;
        if (!ar) {
          continue;
        }

        const floor = Number(ar.floor);
        const ageMs = Number(ar.ageMs) || 0;
        if (Number.isNaN(floor)) {
          continue;
        }

        this.system.pendingRequests.push({ floor, createdAt: now - ageMs });
      }
    }

    this.system.queuedFloors = new Set(Array.isArray(data.queuedFloors) ? data.queuedFloors : []);

    if (data.ui?.buttons) {
      this.ui.applyButtonsSnapshot(data.ui.buttons);
    }

    // Make sure the queue and queuedFloors are consistent.
    this.system.pendingRequests.forEach((r) => this.system.queuedFloors.add(r.floor));

    this.system.dispatch();

    return true;
  }
}

