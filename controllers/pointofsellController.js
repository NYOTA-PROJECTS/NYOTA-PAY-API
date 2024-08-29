const jwt = require("jsonwebtoken");
const { Merchant, MerchantPointOfSell } = require("../models");
const { appendErrorLog } = require("../utils/logging");

const list = async (req, res) => {
    try {
        const merchantId = req.headers.merchantid;
        const merchantPointOfSell = await MerchantPointOfSell.findAll({
            where: { merchantId },
            attributes: ["id", "urlLink"],
            include: [
                {
                    model: Merchant,
                    attributes: ["id", "name"],
                },
            ],
            order: [["urlLink", "ASC"]],
        });

        if (!merchantPointOfSell) {
            return res.status(404).json({
                status: "error",
                message: "Aucun point de vente n'a été trouvé.",
            });
        }

        return res.status(200).json({
            status: "success",
            data: merchantPointOfSell,
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