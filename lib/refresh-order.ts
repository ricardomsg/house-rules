// Polls can overlap on slow connections. Accept completed requests in order so
// an older response cannot replace a newer round or roster already on screen.
export function createRefreshOrder() {
  let issued = 0;
  let applied = 0;
  return {
    begin: () => ++issued,
    accept(ticket: number) {
      if (ticket <= applied) return false;
      applied = ticket;
      return true;
    },
  };
}
