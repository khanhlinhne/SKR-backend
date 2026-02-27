const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const passport = require("passport");
const swaggerUi = require("swagger-ui-express");
const config = require("./config");
const swaggerSpec = require("./config/swagger");
const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middlewares/error.middleware");
const { timezoneConverter } = require("./middlewares/timezone.middleware");

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(timezoneConverter);

if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
}

app.use(passport.initialize());

app.get("/docs/json", (_req, res) => {
  res.json(swaggerSpec);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "SKR System API Docs",
  customCss: ".swagger-ui .topbar { display: none }",
}));

app.get("/", (_req, res) => {
  res.json({ success: true, message: "SKR Backend API is running" });
});

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
