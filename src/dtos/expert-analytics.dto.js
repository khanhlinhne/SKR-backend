function sanitizeOverviewResponse(data) {
  const { timezoneOffset, ...response } = data;
  void timezoneOffset;
  return response;
}

function sanitizeEnrollmentListResponse(data) {
  const { timezoneOffset, allItems, ...response } = data;
  void timezoneOffset;
  void allItems;
  return response;
}

module.exports = {
  sanitizeOverviewResponse,
  sanitizeEnrollmentListResponse,
};
