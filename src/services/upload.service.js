const axios = require("axios");
const config = require("../config");
const AppError = require("../utils/AppError");

const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

const uploadService = {
  async uploadImage(fileBuffer, originalName) {
    if (!config.imgbb.apiKey) {
      throw AppError.internal("ImgBB API key is not configured");
    }

    const base64Image = fileBuffer.toString("base64");
    const imageName = originalName.split(".")[0] || "upload";

    const formData = new URLSearchParams();
    formData.append("key", config.imgbb.apiKey);
    formData.append("image", base64Image);
    formData.append("name", imageName);

    try {
      const response = await axios.post(IMGBB_UPLOAD_URL, formData.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const { data } = response.data;

      return {
        imageId: data.id,
        url: data.url,
        displayUrl: data.display_url,
        thumbUrl: data.thumb?.url || null,
        deleteUrl: data.delete_url,
        width: parseInt(data.width, 10) || null,
        height: parseInt(data.height, 10) || null,
        size: parseInt(data.size, 10) || null,
      };
    } catch (err) {
      const message = err.response?.data?.error?.message || "Failed to upload image to ImgBB";
      throw AppError.internal(message);
    }
  },
};

module.exports = uploadService;
