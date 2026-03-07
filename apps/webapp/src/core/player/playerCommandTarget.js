import * as playerCommandNavigation from "../../../../../packages/shared/src/playerCommandNavigation.js";

const { resolvePlayerCommandNavigation } = playerCommandNavigation;

export function resolvePlayerCommandTarget(commandKey) {
  return resolvePlayerCommandNavigation(commandKey);
}
