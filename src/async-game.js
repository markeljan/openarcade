// Resolve module loading before touching a canvas; obsolete requests never construct a game.
export async function instantiateIfCurrent(loading, isCurrent) {
 const make=await loading;
 return isCurrent()?make():null;
}
