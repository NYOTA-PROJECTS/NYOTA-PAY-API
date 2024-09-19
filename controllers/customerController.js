const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Customer } = require("../models");
const { appendErrorLog } = require("../utils/logging");

const login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone) {
            return res.status(400).json({
                status: "error",
                message: "Le numéro de portable est requis.",
            });
        }

        if (!password) {
            return res.status(400).json({
                status: "error",
                message: "Le mot de passe est requis.",
            })
        }

        const customer = await Customer.findOne({ where: { phone } });
        if (!customer) {
            return res.status(409).json({
                status: "error",
                message: "Compte non enregistrée ou incorrecte. Veuillez réessayer.",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, customer.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: "error",
                message: "Mot de passe invalide ou incorrect. Veuillez réessayer.",
            });
        }

        const token = jwt.sign(
            {
                id: customer.id,
                role: "isCustomer",
            },
            process.env.JWT_SECRET
        );

        const customerResponse = {
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            qrcode: customer.qrcode,
            token: token,
        };

        return res.status(200).json({
            status: "success",
            data: customerResponse,
        });
    } catch (error) {
        console.error(`ERROR LOGIN CUSTOMER: ${error}`);
        appendErrorLog(`ERROR LOGIN CUSTOMER: ${error}`);
        return res.status(500).json({
            status: "error",
            message: "Une erreur s'est produite lors de la connexion.",
        });
    }
}

module.exports = { login };