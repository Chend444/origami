// Single source of truth for the whole simulation.
// Keeping it isolated makes the task easy to adjust.
export const BUILDING_CONFIG = {
  // Includes the ground floor (0..9).
  floorsCount: 10,
  // How many elevator cabins we render + simulate.
  elevatorsCount:5,
  // Visual-only measurements for positioning the cabins.
  floorHeightPx: 56,
  shaftWidthPx: 88,
  elevatorHeightPx: 28,
  // Simulation speed: how long one floor "distance" takes.
  travelTimePerFloorMs: 850,
  // After reaching the floor, keep the cabin here for a short moment.
  doorWaitMs: 2000,
};
