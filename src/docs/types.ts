import type { AbstractDocumentation } from "adminizer";

/**
 * Separates the contributing module's namespace from the document id a module gave its own
 * document: `app-agentiz.tasks`. Document ids travel through URLs (`/dashboard/docs/:id`), the
 * assistant's skills and in-document links, so a dot is deliberate — it needs no escaping in a
 * path segment and stays readable everywhere it shows up.
 */
export const DOCUMENTATION_NAMESPACE_SEPARATOR = ".";

interface DocumentationSourceBase {
  /**
   * Prefix of every document id of this source. Defaults to the `appId` of the app that
   * contributed it, which is what makes ids unique without any module having to think about it.
   */
  namespace?: string;
  /** Viewer grouping applied to documents that declare no `section` of their own. */
  section?: string;
  /**
   * Access token applied to documents that name none. The subsystem never *creates* tokens — the
   * layer that names one here is expected to register it, otherwise its documents stay admin-only.
   */
  accessRightsToken?: string;
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
