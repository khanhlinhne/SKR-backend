const app = require("./app");
const pool = require("./db/connect");

// kết nối database
pool
  .query("SELECT NOW()")
  .then((res) => {
    console.log("DB connected:", res.rows[0]);
  })
  .catch((err) => {
    console.error("DB connection error:", err);
  });

// chạy server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server chạy tại port ${PORT}`);
});
