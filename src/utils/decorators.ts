import 'reflect-metadata';
import { ModelConfig, ModelFieldConfig } from 'adminizer';
import { AbstractModelConfig } from '../abstract/AbstractModelConfig';

// --- Ключи для Reflect Metadata ---
const ADMINIZER_MODEL_KEY = Symbol('adminizer:model');
const ADMINIZER_FIELDS_KEY = Symbol('adminizer:fields');

type DecoratorModelFieldConfig = ModelFieldConfig & {
    views?: {
        list?: ModelFieldConfig | boolean,
        add?: ModelFieldConfig | boolean,
        edit?: ModelFieldConfig | boolean
    } | boolean
}
  
  //
  // --- Декоратор поля модели ---
  export function AdminizerField(options: DecoratorModelFieldConfig) {
    return function (target: any, propertyKey: string) {
      const existingFields: Record<string, DecoratorModelFieldConfig> =
        Reflect.getMetadata(ADMINIZER_FIELDS_KEY, target.constructor) || {};
  
      Reflect.defineMetadata(
        ADMINIZER_FIELDS_KEY,
        {
          ...existingFields,
          [propertyKey]: options,
        },
        target.constructor
      );
    };
  }
  
  //
  // --- Получение метаданных полей ---
  export function getAdminizerFields(target: any): Record<string, ModelConfig> {
    return Reflect.getMetadata(ADMINIZER_FIELDS_KEY, target) || {};
  }
  
  //
  // --- Типы для описания модели ---
  export type AdminizerModelOptions = Partial<
    Pick<
      ModelConfig,
      | 'title'
      | 'icon'
      | 'model'
      | 'identifierField'
      | 'userAccessRelation'
      | 'remove'
      | 'view'
      | 'add'
      | 'edit'
      | 'tools'
      | 'list'
      | 'navbar'
    >
  >;
  
  //
  // --- Декоратор модели ---
  export function AdminizerModel(config: AdminizerModelOptions) {
    return function (target: Function) {
      Reflect.defineMetadata(ADMINIZER_MODEL_KEY, config, target);
    };
  }
  
  //
  // --- Получение метаданных модели ---
  export function getAdminizerModelMetadata(target: Function): AdminizerModelOptions {
    return Reflect.getMetadata(ADMINIZER_MODEL_KEY, target) || {};
  }

// -------------------------------------- Helper
export interface GenerateAdminizerConfigOptions {
    /**
     * Поля, которые нужно исключить полностью (например: createdAt, updatedAt)
     */
    excludeFields?: string[];
  
    /**
     * Принудительное переопределение любых полей конфига
     * (например: add: false, remove: true, tools: [...])
     */
    override?: Partial<ModelConfig>;
  }

/**
 * Генератор ModelConfig из декораторов модели
 */

export function generateAdminizerModelConfig(
    modelClass: Function,
    options: GenerateAdminizerConfigOptions = {}
  ): AbstractModelConfig {
    const fieldMeta: Record<string, ModelFieldConfig & {
      views?: {
        list?: ModelFieldConfig;
        add?: ModelFieldConfig;
        edit?: ModelFieldConfig;
      } | boolean;
    }> = getAdminizerFields(modelClass);
  
    const modelMeta = getAdminizerModelMetadata(modelClass);
    const exclude = new Set(options.excludeFields ?? ['createdAt', 'updatedAt']);
  
    const config: ModelConfig = {
      model: modelMeta.model ?? modelClass.name,
      title: modelMeta.title ?? modelClass.name,
      icon: modelMeta.icon ?? 'star',
      fields: {},
      ...options.override,
      ...modelMeta,
      // Deep-merge list/add/edit so that `fields: {}` is never lost
      // when modelMeta supplies only partial config (e.g. list: { filter: {...} })
      add: {
        fields: {},
        ...(typeof options.override?.add === 'object' ? options.override.add : {}),
        ...(typeof modelMeta.add === 'object' ? modelMeta.add : {}),
      },
      edit: {
        fields: {},
        ...(typeof options.override?.edit === 'object' ? options.override.edit : {}),
        ...(typeof modelMeta.edit === 'object' ? modelMeta.edit : {}),
      },
      list: {
        fields: {},
        ...(typeof options.override?.list === 'object' ? options.override.list : {}),
        ...(typeof modelMeta.list === 'object' ? modelMeta.list : {}),
      },
    };
    for (const [field, meta] of Object.entries(fieldMeta)) {
      if (exclude.has(field)) {
        config.fields![field] = false;
        continue;
      }
  
      // Основная конфигурация поля (fallback)
      config.fields![field] = {
        title: meta.title ?? field,
        required: meta.required ?? false,
        disabled: meta.disabled ?? false,
        type: meta.type ?? 'text',
        ...meta.tooltip && {tooltip: meta.tooltip},
        ...meta.isIn && {isIn: meta.isIn}, 
        ...(meta.options ? { options: meta.options } : {}),
      };
      let _viewsConfig = null;
      if(typeof meta.views === "boolean") {
        _viewsConfig = {
          list: { visible: meta.views},
          add: { visible: meta.views},
          edit: { visible: meta.views}
        }
      } else {
        _viewsConfig = meta.views
      }


      // console.log(_viewsConfig, "<<", field)
      // views.list → list.fields
      if (_viewsConfig?.list) {
        if (config.list && typeof config.list !== 'boolean') {
          config.list.fields![field] = _viewsConfig.list;
        }
      }
  
      // views.add → add.fields
      if (_viewsConfig?.add) {
        if (config.add && typeof config.add !== 'boolean') {
          config.add.fields![field] = _viewsConfig.add;
        }
      }
  
      // views.edit → edit.fields
      if (_viewsConfig?.edit) {
        if (config.edit && typeof config.edit !== 'boolean') {
          config.edit.fields![field] = _viewsConfig.edit;
        }
      }
  
      if (_viewsConfig?.list) {
        if (config.list && typeof config.list !== 'boolean') {
          config.list.fields![field] = _viewsConfig.list;
        }
      } else {
        if (config.list && typeof config.list !== 'boolean') {
          config.list.fields![field] = {};
        }
      }
    }
  

    
    for (const field of exclude) {
      if (!(field in config.fields!)) {
        config.fields![field] = false;
      }
    }
  
    let a = {
      modelname: config.model!,
      config,
    };

    console.log(JSON.stringify(a))
    return a
  }
