const express = require("express");
const morgan = require("morgan");
const indexRoute = require("../routes/index.routes");
const connectDB = require("../config/db");
const app = express();

require("dotenv").config();
connectDB();
app.use(express.json());
app.use(morgan("dev"));
app.use("/api", indexRoute);

module.exports = app;

