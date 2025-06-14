# App-Adminizer Module

This module integrates the Adminizer (admin panel) into a NodeKnit App and provides collection handlers for configuring:
  - Adminizer panel settings (`adminizerConfigs`)
  - Model configurations (`adminizerModelConfigs`)
  - Custom middleware (`adminizerMiddlewares`)

## Collections

- **adminizerConfigs**: Provide overrides for the Adminizer panel configuration.
- **adminizerModelConfigs**: Configure individual models (fields, views, icons) for Adminizer.
- **adminizerMiddlewares**: Register custom Express middleware on the Adminizer app.

### Registering Middleware

In your application class (e.g. in `app-base/index.ts`), define a collection of middleware:

```ts
import { AbstractApp, AppManager, Collection } from '@nodeknit/app-manager';

export class AppYourBase extends AbstractApp {
  // ... other collections (models, controllers)

  @Collection
  adminizerMiddlewares = [
    // Global middleware function
    (req, res, next) => {
      console.log('Adminizer request:', req.method, req.url);
      next();
    },
    // Route-specific middleware
    {
      route: '/custom-route',  // path under Adminizer prefix
      method: 'get',           // HTTP method (get|post|put|...|all)
      handler: (req, res) => {
        res.send('Hello from custom Adminizer route');
      }
    }
  ];
}
```

The middleware will be attached to the Adminizer Express application when the panel is initialized.
