import { BUILDING_CONFIG } from "./config/buildingConfig.js";
import { Elevator } from "./domain/Elevator.js";
import { AudioService } from "./services/AudioService.js";
import { ElevatorSystem } from "./services/ElevatorSystem.js";
import { NearestElevatorPicker } from "./strategies/NearestElevatorPicker.js";
import { ElevatorUI } from "./ui/ElevatorUI.js";

function startApp() {
  const elevators = Array.from(
    { length: BUILDING_CONFIG.elevatorsCount },
    (_, index) => new Elevator(index, 0),
  );

  const elevatorSystem = new ElevatorSystem({
    elevators,
    selector: new NearestElevatorPicker(),
    ui: new ElevatorUI(BUILDING_CONFIG),
    audioService: new AudioService(),
    config: BUILDING_CONFIG,
  });

  elevatorSystem.initialize();
}

startApp();
