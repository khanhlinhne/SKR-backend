const aiChatService = require("../services/ai-chat.service");
const { success } = require("../utils/response.util");

const aiChatController = {
  async chat(req, res, next) {
    try {
      const timezoneOffsetHeader = req.headers["x-timezone-offset"];
      const data = await aiChatService.reply({
        userId: req.user?.userId,
        message: req.body.message,
        messages: req.body.messages,
        language: req.body.language,
        includeContext: req.body.includeContext,
        timezoneOffset:
          timezoneOffsetHeader !== undefined ? timezoneOffsetHeader : req.user?.timezoneOffset,
      });

      return success(res, {
        message: "AI chat response generated successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = aiChatController;
