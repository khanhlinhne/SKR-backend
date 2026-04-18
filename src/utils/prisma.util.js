function isMissingTableError(error, modelName) {
  return (
    error &&
    error.code === "P2021" &&
    (!modelName || error.meta?.modelName === modelName)
  );
}

module.exports = {
  isMissingTableError,
};
