import {AbstractApp} from "@nodeknit/app-manager/lib/AbstractApp";

export class AppAdminizer extends AbstractApp {
  appId: string;
  name: string;

  mount(): Promise<void> {
    return Promise.resolve(undefined);
  }

  unmount(): Promise<void> {
    return Promise.resolve(undefined);
  }

}
