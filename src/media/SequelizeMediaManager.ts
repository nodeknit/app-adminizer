import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { AbstractMediaManager, File } from "adminizer";
import type {
  MediaManagerItem,
  MediaManagerWidgetClientItem,
  MediaManagerWidgetData,
  SortCriteria,
  UploaderFile,
} from "adminizer";
import type { Adminizer } from "adminizer";
import type { Sequelize } from "sequelize";

type MediaRecord = MediaManagerItem & { id: string; parentId?: string | null };

function toItem(record: any): MediaRecord {
  const data = typeof record.get === "function" ? record.get({ plain: true }) : record;
  return {
    id: data.id,
    parent: data.parentId ?? null,
    mimeType: data.mimeType,
    path: data.path,
    size: data.size,
    tag: data.tag ?? "",
    group: data.group ?? undefined,
    url: data.url,
    filename: data.filename,
    createdAt: data.createdAt ? new Date(data.createdAt).getTime() : undefined,
    updatedAt: data.updatedAt ? new Date(data.updatedAt).getTime() : undefined,
  };
}

class SequelizeImageFile extends File<MediaRecord> {
  type = "image" as const;

  constructor(private readonly manager: SequelizeMediaManager) {
    super(manager.urlPathPrefix, manager.fileStoragePath);
  }

  async upload(file: UploaderFile, filename: string, origFileName: string, group?: string): Promise<MediaRecord[]> {
    return [await this.manager.createFile(file, filename, origFileName, group)];
  }

  async getMeta(id: string) {
    return this.manager.getMetaById(id);
  }

  async setMeta(id: string, data: Record<string, string>): Promise<void> {
    await this.manager.setMetaById(id, data);
  }

  async getVariants(id: string): Promise<MediaManagerItem[]> {
    return this.manager.getVariantsById(id);
  }

  async uploadVariant(item: MediaManagerItem, file: UploaderFile, fileName: string, group?: string): Promise<MediaRecord> {
    return this.manager.createFile(file, fileName, item.filename, group, item.id);
  }

  async delete(id: string): Promise<boolean> {
    return this.manager.deleteById(id);
  }

  async getItems(limit: number, skip: number, sort: SortCriteria, group?: string) {
    return this.manager.getByMimeType("image", limit, skip, sort, group);
  }

  async search(s: string, group?: string): Promise<MediaManagerItem[]> {
    return this.manager.searchByMimeType(s, "image", group);
  }

  async getOrigin(id: string): Promise<string> {
    return this.manager.getOriginById(id);
  }

  async getFile(id: string | number): Promise<MediaManagerItem> {
    return this.manager.getFileById(String(id));
  }
}

/** Default filesystem-backed media manager for Sequelize hosts. */
export class SequelizeMediaManager extends AbstractMediaManager {
  id = "default";
  declare fileStoragePath: string;
  urlPathPrefix = "media";
  allowSearch = true;
  uploadMaxBytes = 5 * 1024 * 1024;
  uloadAllowedTypes = ["image/*"];

  constructor(
    adminizer: Adminizer,
    private readonly sequelize: Sequelize,
    fileStoragePath: string,
  ) {
    super(adminizer);
    this.fileStoragePath = fileStoragePath;
    (this as any).itemTypes = [new SequelizeImageFile(this)];
  }

  private get mediaModel(): any {
    return (this.sequelize as any).models.MediaManagerAP;
  }

  private get metaModel(): any {
    return (this.sequelize as any).models.MediaManagerMetaAP;
  }

  private get relationModel(): any {
    return (this.sequelize as any).models.MediaManagerAssociationsAP;
  }

  private storagePath(filename: string): string {
    return path.join(this.fileStoragePath, this.urlPathPrefix, filename);
  }

  private url(filename: string): string {
    return `/public/${this.urlPathPrefix}/${encodeURIComponent(filename)}`;
  }

  private async list(where: Record<string, unknown>, limit: number, skip: number, sort: SortCriteria) {
    const [field, direction] = String(sort).split(" ");
    const orderField = ["createdAt", "updatedAt", "filename", "size"].includes(field) ? field : "createdAt";
    const orderDirection = direction === "ASC" ? "ASC" : "DESC";
    const records = await this.mediaModel.findAll({
      where,
      order: [[orderField, orderDirection]],
      offset: Math.max(skip, 0),
      limit: Math.max(limit, 1) + 1,
    });
    return {
      data: records.slice(0, limit).map(toItem),
      next: records.length > limit,
    };
  }

  async createFile(
    file: UploaderFile,
    filename: string,
    originalName: string,
    group?: string,
    parentId: string | null = null,
  ): Promise<MediaRecord> {
    const storagePath = this.storagePath(filename);
    const metadata = await sharp(storagePath).metadata();
    const record = await this.mediaModel.create({
      id: randomUUID(),
      parentId,
      mimeType: file.mimetype,
      path: storagePath,
      size: file.size,
      group: group ?? null,
      tag: "",
      url: this.url(filename),
      filename: originalName,
    });
    if (metadata.width && metadata.height) {
      await this.setMetaById(record.id, {
        width: String(metadata.width),
        height: String(metadata.height),
      });
    }
    return toItem(record);
  }

  async getAll(limit: number, skip: number, sort: SortCriteria, group?: string) {
    return this.list({ ...(group ? { group } : {}), parentId: null }, limit, skip, sort);
  }

  async getByMimeType(type: string, limit: number, skip: number, sort: SortCriteria, group?: string) {
    return this.list(
      {
        ...(group ? { group } : {}),
        parentId: null,
        mimeType: { [(await import("sequelize")).Op.like]: `${type}/%` },
      },
      limit,
      skip,
      sort,
    );
  }

  async setRelations(data: MediaManagerWidgetData[], model: string, modelId: string | number, widgetName: string): Promise<void> {
    await this.relationModel.destroy({ where: { mediaManagerId: this.id, model, modelId: String(modelId), widgetName } });
    // A partner link has one banner even though the generic gallery supports
    // selecting several files.
    if (model === "UsefulLinkModel" && widgetName === "banner") {
      data = data.slice(0, 1);
    }
    if (data.length) {
      await this.relationModel.bulkCreate(
        data.map((item, sortOrder) => ({
          id: randomUUID(),
          mediaManagerId: this.id,
          model,
          modelId: String(modelId),
          widgetName,
          sortOrder,
          fileId: item.id,
        })),
      );
    }
  }

  async getRelations(model: string, widgetName: string, modelId: string | number): Promise<MediaManagerWidgetClientItem[]> {
    const relations = await this.relationModel.findAll({
      where: { mediaManagerId: this.id, model, modelId: String(modelId), widgetName },
      order: [["sortOrder", "ASC"]],
    });
    const items = await Promise.all(relations.map((relation: any) => this.mediaModel.findByPk(relation.fileId)));
    return items.filter(Boolean).map((record: any): MediaManagerWidgetClientItem => {
      const item = toItem(record);
      return { id: item.id, mimeType: item.mimeType, filename: item.filename, url: item.url, variants: [] };
    });
  }

  async searchAll(s: string, group?: string): Promise<MediaManagerItem[]> {
    return this.searchByMimeType(s, undefined, group);
  }

  async searchByMimeType(s: string, type?: string, group?: string): Promise<MediaManagerItem[]> {
    const { Op } = await import("sequelize");
    const records = await this.mediaModel.findAll({
      where: {
        ...(group ? { group } : {}),
        ...(type ? { mimeType: { [Op.like]: `${type}/%` } } : {}),
        filename: { [Op.like]: `%${s}%` },
      },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    return records.map(toItem);
  }

  async getMetaById(id: string) {
    const records = await this.metaModel.findAll({ where: { parentId: id } });
    return records.map((record: any) => ({ key: record.key, value: record.value }));
  }

  async setMetaById(id: string, data: Record<string, string>): Promise<void> {
    // SQLite permits only one writer at a time, so write image dimensions in
    // sequence instead of issuing concurrent find-or-create statements.
    for (const [key, value] of Object.entries(data)) {
      const [record] = await this.metaModel.findOrCreate({ where: { parentId: id, key }, defaults: { id: randomUUID(), value, isPublic: true } });
      await record.update({ value, isPublic: true });
    }
  }

  async getVariantsById(id: string): Promise<MediaManagerItem[]> {
    const records = await this.mediaModel.findAll({ where: { parentId: id }, order: [["createdAt", "ASC"]] });
    return records.map(toItem);
  }

  async getOriginById(id: string): Promise<string> {
    return (await this.getFileById(id)).path;
  }

  async getFileById(id: string): Promise<MediaRecord> {
    const record = await this.mediaModel.findByPk(id);
    if (!record) throw new Error(`Media file ${id} was not found`);
    return toItem(record);
  }

  async deleteById(id: string): Promise<boolean> {
    if (await this.relationModel.count({ where: { fileId: id } })) return false;
    const records = await this.mediaModel.findAll({ where: { parentId: id } });
    const record = await this.mediaModel.findByPk(id);
    if (!record) return false;
    for (const item of [...records, record]) {
      await fs.unlink(item.path).catch((): void => {});
      await this.metaModel.destroy({ where: { parentId: item.id } });
      await item.destroy();
    }
    return true;
  }
}
