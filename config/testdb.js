// // const {Pool} = require('pg');

// // const pool = new Pool({
// //   connectionString: process.env.DATABASE_URL,
// //   ssl: { rejectUnauthorized: false },
// // });

// // async function testDB() {
// //   const res = await pool.query("SELECT NOW()");
// //   console.log(res.rows);
// // }

// // testDB();

// const { Pool } = require("pg");
// const bcrypt = require("bcrypt");
// require("dotenv").config();

// console.log("DB URL:", process.env.DATABASE_URL);

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// async function createUser() {
//   const email = "admin@gmail.com";
//   const password = "123456";

//   const hashedPassword = await bcrypt.hash(password, 10);

//   const res = await pool.query(
//     "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *",
//     [email, hashedPassword]
//   );

//   console.log(res.rows);
// }

// createUser();

const bcrypt = require("bcrypt");

async function genHash() {
  const hash = await bcrypt.hash("admin", 10);
  console.log(hash);
}

genHash();