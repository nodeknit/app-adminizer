import type { AbstractDocumentation } from "adminizer";

/**
 * Separates the contributing module's namespace from the document id a module gave its own
 * document: `app-agentiz.tasks`. Document ids travel through URLs (`/dashboard/docs/:id`), the
 * assistant's skills and in-document links, so a dot is deliberate — it needs no escaping in a
 * path segment and stays readable everywhere it shows up.
 */
export const DOCUMENTATION_NAMESPACE_SEPARATOR = ".";

/**
 * What the contributing module says about one of its documents — the half of a document's
 * description that is a *decision of the module*, not a property of the text: who may read it.
 * Keyed by the document's own id, the one it has inside its source (`tasks`, not
 * `app-agentiz.tasks`) — a module names its own documents, not the namespace it was given.
 */
export interface DocumentationDocumentOptions {
  /**
   * Access token required on top of the base documentation token. Wins over whatever the document
   * itself declares: access belongs next to the code that registers the token, and must not be
   * changeable by editing an article's text (a markdown file is content — often written and
   * translated by people who do not decide permissions).
   */
  accessRightsToken?: string;
  /** Viewer grouping, if this document belongs somewhere other than the source's section. */
  section?: string;
}

interface DocumentationSourceBase {
  /**
   * Prefix of every document id of this source. Defaults to the `appId` of the app that
   * contributed it, which is what makes ids unique without any module having to think about it.
   */
  namespace?: string;
  /** Viewer grouping applied to documents that declare no `section` of their own. */
  section?: string;
  /**
   * Access token for every document of this source that neither `documents` nor its own
   * frontmatter names one for. The subsystem never *creates* tokens — the layer that names one is
   * expected to register it, otherwise its documents stay admin-only for everybody.
   */
  accessRightsToken?: string;
  /**
   * Per-document rights, keyed by the document's source-local id. This is the place to put them:
   * the entry sits in the same file as the `accessRightsHelper.registerToken` call it refers to,
   * an id that no document has is reported instead of silently doing nothing, and nobody widens
   * their own article's audience by editing its frontmatter.
   *
   * Precedence for one document: this map → the document's own frontmatter → the source default.
   */
  documents?: Record<string, DocumentationDocumentOptions>;
}

/** Markdown files on disk — the common case, served by adminizer's own `FileDocumentation`. */
export interface FileDocumentationSource extends DocumentationSourceBase {
  /** Directory scanned recursively for `*.md`. */
  dir: string;
  /** Locale of files without a locale suffix. @default "en" */
  defaultLocale?: string;
  /** Watch the directory and drop the cache on changes. @default false */
  watch?: boolean;
}

/** Anything else: a module that keeps its documentation in a database or fetches it remotely. */
export interface ProviderDocumentationSource extends DocumentationSourceBase {
  provider: AbstractDocumentation;
}

/**
 * One item of the `documentation` collection. A module contributes documentation as data and
 * never touches the adminizer instance:
 *
 * ```ts
 * @Collection
 * documentation: DocumentationSource[] = [{ dir: path.resolve(here, "docs"), defaultLocale: "ru" }];
 * ```
 */
export type DocumentationSource = FileDocumentationSource | ProviderDocumentationSource;

export function isFileDocumentationSource(
  source: DocumentationSource,
): source is FileDocumentationSource {
  return typeof (source as FileDocumentationSource).dir === "string";
}

export function isProviderDocumentationSource(
  source: DocumentationSource,
): source is ProviderDocumentationSource {
  return Boolean((source as ProviderDocumentationSource).provider);
}
