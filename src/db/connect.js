const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "skr_db",
  password: "200803", //pass máy
  port: 5432,
});

module.exports = pool;