1. **Import the decorators**

   ```ts
   import { AdminizerModel, AdminizerField } from '@nodeknit/app-adminizer';
   ```

2. **Annotate the model class**
   Use `@AdminizerModel` to provide meta-information:

   * `model`: unique identifier
   * `title`: human-readable section name
   * `icon`: icon name (e.g. from lucide-react)

   ```ts
   @AdminizerModel({
     model: 'UserResource',
     title: 'User Resources',
     icon: 'receipt',
   })
   @Table({ tableName: 'user_resources', timestamps: true })
   export class UserResource extends Model<…> { … }
   ```

3. **Configure model fields**
   Mark each field with `@AdminizerField` to control its appearance in add/edit/list views:

   * `title`: label
   * `type`: editor type (e.g. `string`, `ace`, `json`)
   * `views`: per-view options (`add`, `edit`, `list`)
   * `visible`: show or hide in the main list

   ```ts
   @AdminizerField({
     title: 'Configuration',
     type: 'json',
     views: { add: { collapsed: true } },
   })
   @Column({ type: JsonType })
   config: object;
   ```

> **Note:** Models and their properties are configured exactly as in the original Adminizer package. Here, we simply pass through the `@AdminizerModel` decorator to configure the class and the `@AdminizerField` decorator to configure individual fields. For full examples and advanced options, please refer to the Adminizer documentation.
