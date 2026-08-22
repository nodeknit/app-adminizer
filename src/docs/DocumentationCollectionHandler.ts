import type { AppManager } from "@nodeknit/app-manager";
import { CompositeDocumentation } from "./CompositeDocumentation";
import type { DocumentationSource } from "./types";

type CollectionItem = { appId: string; item: any };

/**
 * The `documentation` collection: modules contribute markdown directories (or a whole
 * `AbstractDocumentation` implementation) as data, and this handler mounts them into the single
 * composite adminizer has registered.
 *
 * Both directions of the app-manager lifecycle matter here. Items may arrive before this app is
 * mounted (app-manager replays the collection when the handler appears) and long after it, when
 * another app is mounted at runtime — which is why `onChanged` re-decides the registration instead
 * of `mount()` doing it once.
 */
export class DocumentationCollectionHandler {
  constructor(
    private readonly registry: CompositeDocumentation,
    private readonly onChanged: () => void,
  ) {}

  async process(_appManager: AppManager, data: CollectionItem[]): Promise<void> {
    for (const { appId, item } of data ?? []) {
      if (!item || typeof item !== "object") continue;
      this.registry.add(appId, item as DocumentationSource);
    }
    this.onChanged();
  }

  /**
   * Removal is by `appId`, not by identity: `unprocess` is called with just one app's items when
   * that app is unmounted, and with *every* item when this app goes away, and both have to leave
   * the registry consistent.
   */
  async unprocess(_appManager: AppManager, data: CollectionItem[]): Promise<void> {
    for (const appId of new Set((data ?? []).map((entry) => entry.appId))) {
      this.registry.remove(appId);
    }
    this.onChanged();
  }
}
