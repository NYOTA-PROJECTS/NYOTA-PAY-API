const express = require("express");
//const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
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
//const { getCashRegisterBalance } = require("./controllers/workerController");
//const { Server } = require("socket.io");

// Init express app
const app = express();

/* // Créer un serveur HTTP pour utiliser avec Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Remplacez par votre URL si besoin
    methods: ["GET", "POST"],
  },
}); */

// Firebase cloud messaging initialisation
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Logger
app.use(morgan("tiny"));

// Init dotenv
dotenv.config();

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
      payment: ["self", '"nyota-apps.com"'],
      syncXhr: [],
    },
  })
);

// Routes
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/merchant", createUploadsMerchantFolder, merchantRoutes);
app.use("/api/v1/cashregister", cashregisterRoutes);
app.use("/api/v1/pointofsell", pointofsellRoutes);
app.use("/api/v1/worker", workerRoutes);
app.use("/api/v1/customer", createUploadsCustomerFolder, customers);
app.use("/api/v1/transaction", transactions);

// Socket.IO : Gestion des utilisateurs connectés
// Socket.IO : gestion des connexions
/* io.on("connection", (socket) => {
  console.log("Un utilisateur est connecté");
  socket.on("getWorkerBalance", async (token, cashRegisterId) => {
    try {
      // Utiliser "await" pour attendre la résolution de la promesse avant de continuer
      const balance = await getCashRegisterBalance(token, cashRegisterId); 
      // Si le solde est récupéré avec succès, l'envoyer au client
      if (balance !== null) {
        socket.emit("workerBalance", { balance });
      } else {
        socket.emit("workerBalanceError", { message: "Impossible de récupérer le solde." });
      }
    } catch (error) {
      console.error(`Erreur lors de la récupération du solde: ${error}`);
      socket.emit("workerBalanceError", { message: "Erreur serveur lors de la récupération du solde." });
    }
  });
  socket.on("disconnect", () => {
    console.log("Un utilisateur est déconnecté");
  });
});

server.listen(6881, () => {
  console.log("Le serveur est démarré sur le port 3000");
}); */

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
