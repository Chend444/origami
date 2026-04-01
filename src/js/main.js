import { BUILDING_CONFIG } from "./config/buildingConfig.js";
import { Elevator } from "./domain/Elevator.js";
import { AudioService } from "./services/AudioService.js";
import { ElevatorSystem } from "./services/ElevatorSystem.js";
import { PersistenceService } from "./services/PersistenceService.js";
import { NearestElevatorPicker } from "./strategies/NearestElevatorPicker.js";
import { ElevatorUI } from "./ui/ElevatorUI.js";

function startApp() {
  const elevators = Array.from(
    { length: BUILDING_CONFIG.elevatorsCount },
    (_, index) => new Elevator(index, 0),
  );

  const ui = new ElevatorUI(BUILDING_CONFIG);

  const elevatorSystem = new ElevatorSystem({
    elevators,
    selector: new NearestElevatorPicker(),
    ui,
    audioService: new AudioService(),
    config: BUILDING_CONFIG,
  });

  elevatorSystem.initialize();

  const persistence = new PersistenceService({
    system: elevatorSystem,
    ui,
    config: BUILDING_CONFIG,
  });

  // Small hook so the system can clear saved state when needed.
  elevatorSystem.persistence = persistence;

  persistence.restore();
  persistence.start();
}

startApp();
