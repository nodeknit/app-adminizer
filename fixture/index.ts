import { Sequelize } from "sequelize-typescript";
import {AppManager, SystemApp} from "@nodeknit/app-manager"; // TODO разорбраться с импортом
import {AppAdminizer} from "../dist/src/AppAdminizer.js";

// TODO ставим adminizer как locale_module в dev project чтобы сразу сразу его разрабатывать
// TODO делаем адаптер для sequelize в adminizer (новая ветка админайзера откол из реакта)
// TODO продумать как сделать коллекцию конфигов (adminpanelConfig)
// TODO запустить и проверить что админка работает

process.env.SECRET = "secret";
process.env.INIT_APPS_TO_ENABLE = "example";

try {
  const sequelize = new Sequelize({
    database: "my_database",
    username: "username",
    password: "password",
    host: "localhost",
    dialect: "postgres",
    port: 5432,
  });

  await sequelize.authenticate();
  AppManager.log.info("Connected to PostgreSQL!");

  await sequelize.sync({ force: false });
  AppManager.log.info("Sequelize ORM initialized!");

  // Initializing App Manager
  const appManager = new AppManager(sequelize);

  await appManager.init({
    appsPath: process.env.APPS_PATH ? process.env.APPS_PATH : `${import.meta.dirname}/apps`
  });

  // Defining System App
  const systemApp = new SystemApp(appManager);
  await systemApp._mount();

  const appAdminizer = new AppAdminizer()

  // Start Express-server
  // const PORT = appManager.config.port;
  const PORT = 3000;
  appManager.app.listen(PORT, () => {
    AppManager.log.info(`AppManager started on http://localhost:${PORT}`);
  });

} catch (err) {
  AppManager.log.error("Error starting App Manager:", err);
}

