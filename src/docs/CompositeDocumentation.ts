import {
  AbstractDocumentation,
  Adminizer,
  FileDocumentation,
  type DocContent,
  type DocMeta,
  type DocSearchQuery,
  type DocSearchResult,
} from "adminizer";
import {
  DOCUMENTATION_NAMESPACE_SEPARATOR as SEPARATOR,
  DocumentationSource,
  isFileDocumentationSource,
  isProviderDocumentationSource,
} from "./types";

interface MountedSource {
  appId: string;
  namespace: string;
  provider: AbstractDocumentation;
  section?: string;
  accessRightsToken?: string;
  /** Only file sources have one; stopping it is what makes `remove()` leave nothing behind. */
  stop?: () => void;
}

/**
 * The single `AbstractDocumentation` adminizer sees, assembled from what the installed modules
 * contributed to the `documentation` collection. Adminizer allows exactly one implementation per
 * instance; this is it, and every module's documentation reaches the viewer, the HTTP API and the
 * assistant through it.
 *
 * Ids are namespaced (`<namespace>.<id>`) because they are global handles: they end up in URLs,
 * in the assistant's skill arguments and in links between documents, so two modules shipping an
 * `intro.md` must not be able to shadow each other. Routing `get()` by that prefix is also what
 * keeps the fan-out cheap — only one source is asked for a document.
 *
 * `search`/`forContext`/`keywords` are delegated to each source rather than computed by the base
 * class over our `list()`: a source that can do better (a database with full-text search) has
 * overridden them, and going through the base class would silently throw that away.
 */
export class CompositeDocumentation extends AbstractDocumentation {
  private readonly sources: MountedSource[] = [];
  private readonly changeCallbacks: Array<(ids?: string[]) => void> = [];
  /** Ids already reported as duplicated, so a collision is logged once and not on every request. */
  private readonly reportedCollisions = new Set<string>();

  get size(): number {
    return this.sources.length;
  }

  /** Namespaces currently mounted, in contribution order — for diagnostics. */
  get namespaces(): string[] {
    return this.sources.map((source) => source.namespace);
  }

  add(appId: string, source: DocumentationSource): boolean {
    const provider = this.buildProvider(source);
    if (!provider) {
      Adminizer.log.warn(
        `[documentation] ${appId} contributed a source with neither "dir" nor "provider" — ignored`,
      );
      return false;
    }

    const namespace = (source.namespace ?? appId).trim() || appId;
    if (this.sources.some((mounted) => mounted.namespace === namespace)) {
      Adminizer.log.warn(
        `[documentation] namespace "${namespace}" is contributed twice; ids that collide keep the first source's document`,
      );
    }

    const mounted: MountedSource = {
      appId,
      namespace,
      provider,
      section: source.section,
      accessRightsToken: source.accessRightsToken,
      stop: provider instanceof FileDocumentation ? () => provider.stopWatcher() : undefined,
    };
    this.sources.push(mounted);

    // A source that can tell us it changed (a watched directory) invalidates the readers above us;
    // ids are translated on the way out, since nobody outside knows the source-local ones.
    provider.onChange?.((ids) =>
      this.emitChange(ids?.map((id) => this.qualify(mounted.namespace, id))),
    );
    this.emitChange();
    return true;
  }

  /** Drops everything an app contributed; returns how many sources went away. */
  remove(appId: string): number {
    const kept: MountedSource[] = [];
    let removed = 0;
    for (const source of this.sources) {
      if (source.appId !== appId) {
        kept.push(source);
        continue;
      }
      source.stop?.();
      removed += 1;
    }
    if (removed === 0) return 0;
    this.sources.length = 0;
    this.sources.push(...kept);
    this.reportedCollisions.clear();
    this.emitChange();
    return removed;
  }

  clear(): void {
    for (const source of this.sources) source.stop?.();
    this.sources.length = 0;
    this.reportedCollisions.clear();
    this.emitChange();
  }

  async list(locale?: string): Promise<DocMeta[]> {
    const documents = new Map<string, DocMeta>();
    for (const source of this.sources) {
      const metas = await this.fromSource(source, () => source.provider.list(locale), []);
      for (const meta of metas) this.collect(documents, source, meta);
    }
    return [...documents.values()];
  }

  async get(id: string, locale?: string): Promise<DocContent | undefined> {
    const target = this.route(id);
    if (!target) return undefined;
    const { source, localId } = target;
    const content = await this.fromSource(
      source,
      () => source.provider.get(localId, locale),
      undefined,
    );
    if (!content) return undefined;
    return { ...content, meta: this.decorate(source, content.meta) };
  }

  async search(query: DocSearchQuery, locale?: string): Promise<DocSearchResult[]> {
    const seen = new Set<string>();
    const results: DocSearchResult[] = [];
    for (const source of this.sources) {
      const found = await this.fromSource(source, () => source.provider.search(query, locale), []);
      for (const result of found) {
        const meta = this.decorate(source, result.meta);
        if (seen.has(meta.id)) continue;
        seen.add(meta.id);
        results.push({ ...result, meta });
      }
    }
    return results;
  }

  async forContext(ctx: { url?: string; model?: string }, locale?: string): Promise<DocMeta[]> {
    const documents = new Map<string, DocMeta>();
    for (const source of this.sources) {
      const metas = await this.fromSource(source, () => source.provider.forContext(ctx, locale), []);
      for (const meta of metas) this.collect(documents, source, meta);
    }
    return [...documents.values()];
  }

  async keywords(locale?: string): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    for (const source of this.sources) {
      const keywords = await this.fromSource(
        source,
        () => source.provider.keywords(locale),
        new Map<string, string[]>(),
      );
      for (const [keyword, ids] of keywords) {
        const merged = map.get(keyword) ?? [];
        for (const id of ids) {
          const qualified = this.qualify(source.namespace, id);
          if (!merged.includes(qualified)) merged.push(qualified);
        }
        map.set(keyword, merged);
      }
    }
    return map;
  }

  /**
   * A reference is resolved by the source the referring document belongs to first — how links are
   * spelled inside a document is that implementation's business, and the common case is a sibling
   * article of the same module. Only then is the reference tried as a fully qualified id, which is
   * the one form that can point across modules.
   */
  async resolveLink(fromId: string, ref: string): Promise<string | undefined> {
    const origin = this.route(fromId);
    if (origin) {
      const local = await this.fromSource(
        origin.source,
        () => origin.source.provider.resolveLink(origin.localId, ref),
        undefined,
      );
      if (local) return this.qualify(origin.source.namespace, local);
    }

    const wanted = ref.trim().replace(/#.*$/, "");
    if (!wanted) return undefined;
    const target = this.route(wanted);
    if (!target) return undefined;
    const exists = await this.fromSource(
      target.source,
      () => target.source.provider.get(target.localId),
      undefined,
    );
    return exists ? this.qualify(target.source.namespace, target.localId) : undefined;
  }

  onChange(cb: (ids?: string[]) => void): void {
    this.changeCallbacks.push(cb);
  }

  private emitChange(ids?: string[]): void {
    for (const cb of this.changeCallbacks) cb(ids);
  }

  private buildProvider(source: DocumentationSource): AbstractDocumentation | undefined {
    if (isProviderDocumentationSource(source)) return source.provider;
    if (isFileDocumentationSource(source)) {
      return new FileDocumentation({
        dir: source.dir,
        defaultLocale: source.defaultLocale,
        watch: source.watch,
      });
    }
    return undefined;
  }

  /** `<namespace>.<localId>`; ids are never qualified twice. */
  private qualify(namespace: string, localId: string): string {
    return `${namespace}${SEPARATOR}${localId}`;
  }

  private route(id: string): { source: MountedSource; localId: string } | undefined {
    const separator = id.indexOf(SEPARATOR);
    if (separator <= 0) return undefined;
    const namespace = id.slice(0, separator);
    const localId = id.slice(separator + SEPARATOR.length);
    if (!localId) return undefined;
    const source = this.sources.find((mounted) => mounted.namespace === namespace);
    return source ? { source, localId } : undefined;
  }

  private decorate(source: MountedSource, meta: DocMeta): DocMeta {
    return {
      ...meta,
      id: this.qualify(source.namespace, meta.id),
      section: meta.section ?? source.section,
      accessRightsToken: meta.accessRightsToken ?? source.accessRightsToken,
    };
  }

  private collect(documents: Map<string, DocMeta>, source: MountedSource, meta: DocMeta): void {
    const decorated = this.decorate(source, meta);
    if (documents.has(decorated.id)) {
      if (!this.reportedCollisions.has(decorated.id)) {
        this.reportedCollisions.add(decorated.id);
        Adminizer.log.warn(
          `[documentation] duplicate document id "${decorated.id}"; the first source keeps it`,
        );
      }
      return;
    }
    documents.set(decorated.id, decorated);
  }

  /**
   * Every call into a source is isolated: a module with an unreadable directory or a broken
   * database query must cost its own documents, not the whole knowledge base. The implementation
   * also learns about `adminizer` here — it is assigned to us when we are registered, which is
   * after most sources have already been mounted.
   */
  private async fromSource<T>(
    source: MountedSource,
    call: () => Promise<T>,
    fallback: T,
  ): Promise<T> {
    if (this.adminizer && !source.provider.adminizer) {
      source.provider.adminizer = this.adminizer;
    }
    try {
      return await call();
    } catch (error: any) {
      Adminizer.log.error(
        `[documentation] source "${source.namespace}" (${source.appId}) failed: ${error?.message ?? error}`,
      );
      return fallback;
    }
  }
}
