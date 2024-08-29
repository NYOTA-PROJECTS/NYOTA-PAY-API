const jwt = require("jsonwebtoken");
const { Merchant, MerchantPointOfSell } = require("../models");
const { appendErrorLog } = require("../utils/logging");

const list = async (req, res) => {
    try {
        const merchantId = req.headers.merchantid;
        if (!merchantId) {
            return res.status(400).json({
                status: "error",
                message: "L'identifiant du marchand est requis.",
            });
        }

        const merchant = await Merchant.findOne({ where: { id: merchantId } });
        if (!merchant) {
            return res.status(400).json({
                status: "error",
                message: "Le compte du marchand n'existe pas.",
            });
        }
        
        const merchantPointOfSell = await MerchantPointOfSell.findAll({
            where: {merchantId: merchantId },
            attributes: ["id", "urlLink"],
            order: [["urlLink", "ASC"]],
        });

        if (!merchantPointOfSell) {
            return res.status(404).json({
                status: "error",
                message: "Aucun point de vente n'a été trouvé.",
            });
        }

        const response = merchantPointOfSell.map((merchantPointOfSell) => {
            return {
                id: merchantPointOfSell.id,
                name: merchantPointOfSell.urlLink,
            };
        });

        return res.status(200).json({
            status: "success",
            data: response,
        });
    } catch (error) {
        console.error(`ERROR LISTING POINT OF SELL: ${error}`);
        appendErrorLog(`ERROR LISTING POINT OF SELL: ${error}`);
        return res.status(500).json({
            status: "error",
            message: "Une erreur s'est produite lors de la recupération des points de vente.",
        });
    }
};

module.exports = { list }