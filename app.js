require("./utils/instrument");
const Sentry = require("@sentry/node");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();
const morgan = require("morgan");
const helmet = require("helmet");
const fs = require("fs");
const admin = require("firebase-admin");
const permissionsPolicy = require("permissions-policy");
const serviceAccount = require("./utils/firebase.json");
const adminRoutes = require("./routes/adminRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const merchantRoutes = require("./routes/merchantRoutes");
const cashregisterRoutes = require("./routes/cashregisterRoutes");
const pointofsellRoutes = require("./routes/pointofsellRoutes");
const workerRoutes = require("./routes/workerRoutes");
const customers = require("./routes/customerRoutes");
const transactions = require("./routes/transactionRoutes");

// Init express app
const app = express();

// Firebase cloud messaging initialisation
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Logger
app.use(morgan("dev"));

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to create the destination folder for public
const createUploadsMerchantFolder = (req, res, next) => {
  const folderPath = "public/merchants";
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  next();
};
const createUploadsCustomerFolder = (req, res, next) => {
  const folderPath = "public/customers";
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  next();
};

const createUploadsMerchantPictureFolder = (req, res, next) => {
  const folderPath = "public/pictures";
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  next();
};


// Public directory
app.use(express.static("public"));

// Implement security measures
// XSS protection
app.use(helmet.xssFilter());
app.use(helmet.frameguard({ action: "sameorigin" }));
app.use(helmet.dnsPrefetchControl());
app.use(helmet.referrerPolicy({ policy: "same-origin" }));
app.use(helmet.noSniff());
app.use(helmet());

// CSP protection
app.use(
  helmet.contentSecurityPolicy({ directives: { defaultSrc: ["'self'"] } })
);

// Permissions policy
app.use(
  permissionsPolicy({
    features: {
      payment: ["self", '"nyota-api.com"'],
      syncXhr: [],
    },
  })
);

// Routes
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/merchant", createUploadsMerchantFolder, createUploadsMerchantPictureFolder, merchantRoutes);
app.use("/api/v1/cashregister", cashregisterRoutes);
app.use("/api/v1/pointofsell", pointofsellRoutes);
app.use("/api/v1/worker", workerRoutes);
app.use("/api/v1/customer", createUploadsCustomerFolder, customers);
app.use("/api/v1/transaction", transactions);

// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

// Export app
const port = process.env.PORT || 3000;

// Start server
app.listen(port, () => {
  console.log(`
  ==================================
  |🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀|
  |===== API NYOTA PAY MOBILE =====|
  |======= ENV: ${process.env.NODE_ENV} =======|
  |========== POST: ${process.env.PORT} ==========|
  |🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀|
  ==================================
  `);
});
