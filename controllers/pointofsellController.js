const { Merchant, PointOfSale } = require("../models");
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
        
        const pointOfSell = await PointOfSale.findAll({
            where: {merchantId: merchantId },
            attributes: ["id", "urlLink"],
            order: [["urlLink", "ASC"]],
        });

        if (!pointOfSell) {
            return res.status(404).json({
                status: "error",
                message: "Aucun point de vente n'a été trouvé.",
            });
        }

        const response = pointOfSell.map((pos) => {
            return {
                id: pos.id,
                name: pos.urlLink,
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

const create = async (req, res) => {
    try {
        const { merchantId, name } = req.body;

        if (!merchantId) {
            return res.status(400).json({
                status: "error",
                message: "L'identifiant du marchand est requis.",
            });
        }

        if (!name) {
            return res.status(400).json({
                status: "error",
                message: "Le nom du point de vente est requis.",
            });
        }

        const merchant = await Merchant.findOne({ where: { id: merchantId } });
        if (!merchant) {
            return res.status(400).json({
                status: "error",
                message: "Le compte du marchand n'existe pas.",
            });
        }
        
        const existingPointOfSell = await PointOfSale.findOne({ where: { urlLink: name } });
        if (existingPointOfSell) {
            return res.status(400).json({
                status: "error",
                message: "Le point de vente existe déjà.",
            });
        }
        await PointOfSale.create({ urlLink: name, merchantId });

        return res.status(201).json({
            status: "success",
            message: "Le point de vente a été créé avec succes!",
        });
    } catch (error) {
        console.error(`ERROR CREATING POINT OF SELL: ${error}`);
        appendErrorLog(`ERROR CREATING POINT OF SELL: ${error}`);
        return res.status(500).json({
            status: "error",
            message: "Une erreur s'est produite lors de la creation du point de vente.",
        });
    }
}

const destroy = async (req, res) => {
    try {
        const { posId } = req.body;
        if (!posId) {
            return res.status(400).json({
                status: "error",
                message: "L'identifiant du point de vente est requis.",
            });
        }

        const pointOfSell = await PointOfSale.findOne({ where: { id: posId } });
        if (!pointOfSell) {
            return res.status(400).json({
                status: "error",
                message: "Le point de vente n'existe pas.",
            });
        }
        await pointOfSell.destroy();
        
        return res.status(200).json({
            status: "success",
            message: "Le point de vente a été supprimé avec succes!",
        });
        
    } catch (error) {
        console.error(`ERROR DELETING POINT OF SELL: ${error}`);
        appendErrorLog(`ERROR DELETING POINT OF SELL: ${error}`);
        return res.status(500).json({
            status: "error",
            message: "Une erreur s'est produite lors de la suppression du point de vente.",
        });
    }
}

module.exports = { create, list, destroy }