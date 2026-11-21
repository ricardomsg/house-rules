export type RelayStroke = { color: string; width: number; points: Array<[number, number]> };
export const RELAY_MAX_STROKES = 40;
export const RELAY_MAX_POINTS = 1200;
export function relayPointCount(drawing: RelayStroke[]) {
  return drawing.reduce((total, stroke) => total + stroke.points.length, 0);
}
export function relayHasRoom(drawing: RelayStroke[]) {
  return drawing.length < RELAY_MAX_STROKES && relayPointCount(drawing) <= RELAY_MAX_POINTS - 2;
}
