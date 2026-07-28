import { SYSTEM_MODEL_NAMES } from "adminizer";
import type { SystemModelName, SystemModelBindings } from "adminizer";

/**
 * Registry of host models that take over an Adminizer system model.
 *
 * Adminizer 5.0 lets the host decide which ORM model implements each logical
 * system model (`User`, `Group`, …). Instead of hard-coding that map, a host
 * model declares the role with `@AdminizerSystemModel("User")`; everything not
 * declared falls back to the built-in `<Name>AP` model defined by
 * `registerSequelizeSystemModels`.
 *
 * The decorator runs at import time, so the registry is fully populated before
 * the Adminizer app mounts.
 */
const overrides = new Map<SystemModelName, Function>();

/**
 * Mark a host model class as the implementation of an Adminizer system model.
 *
 * The decorated model must satisfy the Adminizer contract for `systemName`
 * (see `SYSTEM_MODEL_CONTRACTS`) — required fields, primary key and relations
 * are validated during `adminizer.init()`.
 *
 * @example
 *   @AdminizerSystemModel("User")
 *   @Table({ tableName: "users" })
 *   class UserModel extends Model { ... }
 */
export function AdminizerSystemModel(systemName: SystemModelName): ClassDecorator {
  return (target) => {
    overrides.set(systemName, target as unknown as Function);
  };
}

/** Host model class that overrides `systemName`, or undefined when none. */
export function getSystemModelOverride(systemName: SystemModelName): Function | undefined {
  return overrides.get(systemName);
}

/** All registered system-model overrides keyed by logical system name. */
export function getSystemModelOverrides(): ReadonlyMap<SystemModelName, Function> {
  return overrides;
}

/**
 * Build the logical → host model-name map for the ORM adapter, honouring any
 * `@AdminizerSystemModel` overrides and falling back to `<Name>AP` defaults.
 *
 * Pure (no ORM side effects) so it can be evaluated when the adapter is
 * constructed; the matching models are defined later by
 * `registerSequelizeSystemModels`.
 */
export function buildSystemModelBindings(): SystemModelBindings {
  const bindings: SystemModelBindings = {};
  for (const name of SYSTEM_MODEL_NAMES) {
    const override = overrides.get(name) as { name?: string } | undefined;
    bindings[name] = override?.name ?? `${name}AP`;
  }
  return bindings;
}
