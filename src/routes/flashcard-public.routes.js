const { Router } = require("express");
const flashcardController = require("../controllers/flashcard.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authenticateOptional } = require("../middlewares/auth.middleware");
const {
  getPublicSetsRules,
  setIdParamRules,
} = require("../validators/flashcard.validator");

const router = Router();

router.get(
  "/",
  authenticateOptional,
  getPublicSetsRules,
  validate,
  flashcardController.getPublicSets
);

router.get(
  "/:id",
  authenticateOptional,
  setIdParamRules,
  validate,
  flashcardController.getPublicSetById
);

module.exports = router;
