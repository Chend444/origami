export class NearestElevatorPicker {
  pick(elevators, requestFloor) {
    if (!Array.isArray(elevators) || elevators.length === 0) {
      return null;
    }

    let best = null;

    for (const current of elevators) {
      if (!best) {
        best = current;
        continue;
      }

      const bestDistance = best.distanceTo(requestFloor);
      const currentDistance = current.distanceTo(requestFloor);

      if (currentDistance < bestDistance) {
        best = current;
        continue;
      }

      if (currentDistance === bestDistance && current.id < best.id) {
        best = current;
      }
    }

    return best;
  }
}
