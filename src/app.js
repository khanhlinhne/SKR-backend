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

app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [config.clientUrl];
      if (process.env.VERCEL_URL) {
        allowed.push(`https://${process.env.VERCEL_URL}`);
      }
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }
      if (process.env.VERCEL && origin?.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
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

if (process.env.VERCEL) {
  const SWAGGER_CDN = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5";

  app.get("/docs", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SKR System API Docs</title>
  <link rel="stylesheet" href="${SWAGGER_CDN}/swagger-ui.css">
  <style>.swagger-ui .topbar { display: none }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_CDN}/swagger-ui-bundle.js"></script>
  <script src="${SWAGGER_CDN}/swagger-ui-standalone-preset.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/docs/json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'StandaloneLayout',
    });
  </script>
</body>
</html>`);
  });
} else {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "SKR System API Docs",
    customCss: ".swagger-ui .topbar { display: none }",
  }));
}

app.get("/", (_req, res) => {
  res.json({ success: true, message: "SKR Backend API is running" });
});

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
