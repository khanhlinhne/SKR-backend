const assert = require("node:assert/strict");
const router = require("../src/routes/course.routes");

function getPostRouteStack(path) {
  const layer = router.stack.find(
    (item) => item.route?.path === path && item.route?.methods?.post
  );

  assert(layer, `Expected POST route "${path}" to exist`);
  return layer.route.stack.map((item) => item.name);
}

const routePath = "/:courseId/chapters/:chapterId/lessons/:lessonId/documents";
const middlewareNames = getPostRouteStack(routePath);

assert(
  middlewareNames.includes("multerMiddleware"),
  [
    `Expected ${routePath} to include multer middleware for file uploads.`,
    `Actual middleware chain: ${middlewareNames.join(" -> ") || "(empty)"}`,
  ].join(" "),
);

assert(
  middlewareNames.includes("handleDocumentMulterError"),
  [
    `Expected ${routePath} to include document upload error handling.`,
    `Actual middleware chain: ${middlewareNames.join(" -> ") || "(empty)"}`,
  ].join(" "),
);

console.log("Lesson document upload route is wired for multipart uploads.");
