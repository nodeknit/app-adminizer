import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  AbstractDocumentation,
  type DocContent,
  type DocMeta,
  type DocSearchQuery,
  type DocSearchResult,
} from "adminizer";
import { CompositeDocumentation } from "../src/docs/CompositeDocumentation";
import { DocumentationCollectionHandler } from "../src/docs/DocumentationCollectionHandler";

/** A source that answers from memory and reports whether its own `search` was used. */
class MemoryDocumentation extends AbstractDocumentation {
  searchCalls = 0;

  constructor(private readonly documents: Array<DocMeta & { markdown: string }>) {
    super();
  }

  async list(): Promise<DocMeta[]> {
    return this.documents.map(({ markdown, ...meta }) => meta);
  }

  async get(id: string): Promise<DocContent | undefined> {
    const found = this.documents.find((doc) => doc.id === id);
    if (!found) return undefined;
    const { markdown, ...meta } = found;
    return { meta, markdown, locale: "en" };
  }

  async search(_query: DocSearchQuery): Promise<DocSearchResult[]> {
    this.searchCalls += 1;
    return this.documents.map(({ markdown, ...meta }) => ({ meta, snippets: ["from the source"] }));
  }
}

function doc(id: string, extra: Partial<DocMeta> = {}): DocMeta & { markdown: string } {
  return {
    id,
    title: id,
    keywords: [],
    models: [],
    urls: [],
    markdown: `# ${id}`,
    ...extra,
  };
}

describe("CompositeDocumentation", () => {
  it("namespaces ids by the contributing app and routes `get` back to its source", async () => {
    const registry = new CompositeDocumentation();
    registry.add("app-one", { provider: new MemoryDocumentation([doc("intro")]) });
    registry.add("app-two", { provider: new MemoryDocumentation([doc("intro")]) });

    expect((await registry.list()).map((meta) => meta.id)).toEqual([
      "app-one.intro",
      "app-two.intro",
    ]);
    expect((await registry.get("app-two.intro"))?.meta.id).toBe("app-two.intro");
    expect(await registry.get("intro")).toBeUndefined();
    expect(await registry.get("app-three.intro")).toBeUndefined();
  });

  it("takes the namespace from the source when it names one", async () => {
    const registry = new CompositeDocumentation();
    registry.add("app-one", { namespace: "guides", provider: new MemoryDocumentation([doc("a")]) });

    expect((await registry.list()).map((meta) => meta.id)).toEqual(["guides.a"]);
  });

  it("applies the source's section and access token only where the document declares none", async () => {
    const registry = new CompositeDocumentation();
    registry.add("app-one", {
      section: "Agentiz",
      accessRightsToken: "read-internal",
      provider: new MemoryDocumentation([
        doc("plain"),
        doc("own", { section: "Other", accessRightsToken: "read-other" }),
      ]),
    });

    const [plain, own] = await registry.list();
    expect(plain.section).toBe("Agentiz");
    expect(plain.accessRightsToken).toBe("read-internal");
    expect(own.section).toBe("Other");
    expect(own.accessRightsToken).toBe("read-other");
  });

  it("keeps the first document when two sources produce the same id", async () => {
    const registry = new CompositeDocumentation();
    registry.add("app-one", {
      namespace: "shared",
      provider: new MemoryDocumentation([doc("intro", { title: "first" })]),
    });
    registry.add("app-two", {
      namespace: "shared",
      provider: new MemoryDocumentation([doc("intro", { title: "second" })]),
    });

    const documents = await registry.list();
    expect(documents).toHaveLength(1);
    expect(documents[0].title).toBe("first");
  });

  it("delegates search to the sources instead of scanning list()/get() itself", async () => {
    const source = new MemoryDocumentation([doc("intro")]);
    const registry = new CompositeDocumentation();
    registry.add("app-one", { provider: source });

    const results = await registry.search({ query: "anything" });
    expect(source.searchCalls).toBe(1);
    expect(results.map((result) => result.meta.id)).toEqual(["app-one.intro"]);
    expect(results[0].snippets).toEqual(["from the source"]);
  });

  it("merges the keyword map across sources", async () => {
    const registry = new CompositeDocumentation();
    registry.add("app-one", { provider: new MemoryDocumentation([doc("a", { keywords: ["run"] })]) });
    registry.add("app-two", { provider: new MemoryDocumentation([doc("b", { keywords: ["run"] })]) });

    expect(await registry.keywords()).toEqual(new Map([["run", ["app-one.a", "app-two.b"]]]));
  });

  it("resolves a reference inside its own source first, and a qualified id across sources", async () => {
    const registry = new CompositeDocumentation();
    registry.add("app-one", { provider: new MemoryDocumentation([doc("intro"), doc("deep")]) });
    registry.add("app-two", { provider: new MemoryDocumentation([doc("intro")]) });

    expect(await registry.resolveLink("app-one.intro", "deep")).toBe("app-one.deep");
    expect(await registry.resolveLink("app-one.intro", "app-two.intro")).toBe("app-two.intro");
    expect(await registry.resolveLink("app-one.intro", "app-two.missing")).toBeUndefined();
    expect(await registry.resolveLink("app-one.intro", "nowhere")).toBeUndefined();
  });

  it("keeps one broken source from taking the whole knowledge base down", async () => {
    class BrokenDocumentation extends AbstractDocumentation {
      async list(): Promise<DocMeta[]> {
        throw new Error("no");
      }
      async get(): Promise<DocContent | undefined> {
        throw new Error("no");
      }
    }

    const registry = new CompositeDocumentation();
    registry.add("app-broken", { provider: new BrokenDocumentation() });
    registry.add("app-one", { provider: new MemoryDocumentation([doc("intro")]) });

    expect((await registry.list()).map((meta) => meta.id)).toEqual(["app-one.intro"]);
  });

  it("ignores a source that names neither a directory nor a provider", async () => {
    const registry = new CompositeDocumentation();
    expect(registry.add("app-one", {} as any)).toBe(false);
    expect(registry.size).toBe(0);
  });

  it("notifies subscribers when a source is added or removed", async () => {
    const registry = new CompositeDocumentation();
    let changes = 0;
    registry.onChange(() => {
      changes += 1;
    });

    registry.add("app-one", { provider: new MemoryDocumentation([doc("intro")]) });
    expect(changes).toBe(1);
    registry.remove("app-one");
    expect(changes).toBe(2);
    expect(await registry.list()).toEqual([]);
  });
});

describe("DocumentationCollectionHandler", () => {
  it("mounts what an app contributed and drops it again by appId", async () => {
    const registry = new CompositeDocumentation();
    let syncs = 0;
    const handler = new DocumentationCollectionHandler(registry, () => {
      syncs += 1;
    });

    await handler.process({} as any, [
      { appId: "app-one", item: { provider: new MemoryDocumentation([doc("a")]) } },
      { appId: "app-two", item: { provider: new MemoryDocumentation([doc("b")]) } },
    ]);
    expect(registry.namespaces).toEqual(["app-one", "app-two"]);
    expect(syncs).toBe(1);

    await handler.unprocess({} as any, [
      { appId: "app-one", item: { provider: new MemoryDocumentation([doc("a")]) } },
    ]);
    expect(registry.namespaces).toEqual(["app-two"]);
    expect(syncs).toBe(2);
  });
});

describe("markdown sources on disk", () => {
  let dir: string;

  beforeAll(async () => {
    dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "adminizer-docs-"));
    await fs.promises.writeFile(
      path.join(dir, "tasks.ru.md"),
      [
        "---",
        "title: Задачи",
        "keywords: [задачи, запуск]",
        "models: [AgentTask]",
        "urls:",
        "  - /dashboard/agentiz-tasks",
        "---",
        "",
        "# Задачи",
        "",
        "Как запустить пайплайн из задачи.",
      ].join("\n"),
      "utf8",
    );
  });

  afterAll(async () => {
    await fs.promises.rm(dir, { recursive: true, force: true });
  });

  it("serves a directory contributed as `{ dir }` under the app's namespace", async () => {
    const registry = new CompositeDocumentation();
    registry.add("app-agentiz", { dir, defaultLocale: "ru", section: "Agentiz" });

    const documents = await registry.list("ru");
    expect(documents.map((meta) => meta.id)).toEqual(["app-agentiz.tasks"]);
    expect(documents[0].title).toBe("Задачи");
    expect(documents[0].section).toBe("Agentiz");

    const content = await registry.get("app-agentiz.tasks", "ru");
    expect(content?.locale).toBe("ru");
    expect(content?.markdown).toContain("Как запустить пайплайн");
  });

  it("binds documents to the admin page and model named in the frontmatter", async () => {
    const registry = new CompositeDocumentation();
    registry.add("app-agentiz", { dir, defaultLocale: "ru" });

    expect(
      (await registry.forContext({ url: "/dashboard/agentiz-tasks" }, "ru")).map((meta) => meta.id),
    ).toEqual(["app-agentiz.tasks"]);
    expect((await registry.forContext({ model: "AgentTask" }, "ru")).map((meta) => meta.id)).toEqual([
      "app-agentiz.tasks",
    ]);
    expect(await registry.forContext({ url: "/dashboard/agentiz-runs" }, "ru")).toEqual([]);
  });
});
