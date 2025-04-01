import { Sequelize } from "sequelize-typescript";
// import { Example } from "./models/Example";
// import { JsonSchema } from "./models/JsonSchema";
// import { Test } from "./models/Test";
// import { User } from "./models/User";
import { AppManager } from "../dist/lib/AppManager.js";
import SystemApp from "../dist/system/SystemApp.js";
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
    // Start Express-server
    // const PORT = appManager.config.port;
    const PORT = 3000;
    appManager.app.listen(PORT, () => {
        AppManager.log.info(`AppManager started on http://localhost:${PORT}`);
    });
}
catch (err) {
    AppManager.log.error("Error starting App Manager:", err);
}
// TODO there is sequelize start and model handle test code
// const sequelize = new Sequelize({
//   database: "my_database",
//   username: "username",
//   password: "password",
//   host: "localhost",
//   dialect: "postgres",
//   port: 5432,
//   models: [Test, User]
// });
//
// try {
//   await sequelize.authenticate();
//   console.log("Connected to PostgreSQL!");
//
//   // Синхронизация только с Test и User
//   await sequelize.sync({ force: false });
//   console.log("Sequelize ORM initialized!");
//
//   // Создание тестовой записи в Test
//   const newTest = await Test.create({
//     title: "Sample Test",
//     title_2: "Secondary Title",
//     test_ck5_1: "Test Value",
//   });
//   console.log("Test record created:", newTest.toJSON());
//
//   // Поиск тестовой записи
//   const foundTest = await Test.findOne({ where: { title: "Sample Test" } });
//   console.log("Found Test record:", foundTest?.toJSON());
//
//   // Динамическое добавление новых моделей
//   sequelize.addModels([Example, JsonSchema]);
//
//   // Повторная синхронизация (но теперь уже с Example и JsonSchema)
//   await sequelize.sync({ force: false });
//   console.log("New models added dynamically!");
//
//   // Создание тестовой записи в Example
//   const newExample = await Example.create({
//     title: "Sample Example",
//   });
//   console.log("Example record created:", newExample.toJSON());
//
//   // Поиск записи в Example
//   const foundExample = await Example.findOne({ where: { title: "Sample Example" } });
//   console.log("Found Example record:", foundExample?.toJSON());
// } catch (err) {
//   console.error("Error initializing Sequelize:", err);
// }
