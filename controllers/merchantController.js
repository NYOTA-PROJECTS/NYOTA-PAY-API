const bcrypt = require("bcrypt");
const {
  Merchant,
  MerchantAdmin,
  MerchantPointOfSell,
  MerchantBalance,
  Category,
} = require("../models");
const { sequelize } = require("../models");
const { appendErrorLog } = require("../utils/logging");

const create = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { name, categoryId, photo, admins, pointsOfSell } = req.body;
    const host = req.get("host");
    //const picture = req.file;

    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Le nom du marchand est requis.",
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        status: "error",
        message: "La catégorie du marchand est requise.",
      });
    }

    if (!admins) {
      return res.status(400).json({
        status: "error",
        message: "Le ou les administrateur(s) sont requis.",
      });
    }

    if (!pointsOfSell) {
      return res.status(400).json({
        status: "error",
        message: "Le ou les liens des points de vente sont requis.",
      });
    }

    const category = await Category.findOne({ where: { id: categoryId } });
    if (!category) {
      return res.status(400).json({
        status: "error",
        message:
          "La catégorie du marchand n'a pas éte reconnue ou n'existe pas.",
      });
    }

    let imageUrl = null;
    if (req.file) {
      const fileUrl = `merchants/${req.file.filename}`;
      imageUrl = `${req.protocol}://${host}/${fileUrl}`;
    }

    // 1. Création du marchand
    const newMerchant = await Merchant.create(
      {
        name,
        categoryId,
        photo: imageUrl,
      },
      { transaction }
    );

    // 2. Initialisation du solde du marchand à 0
    await MerchantBalance.create(
      {
        merchantId: newMerchant.id,
        amount: 0,
      },
      { transaction }
    );

    // 3. Ajout des administrateurs
    for (const admin of admins) {
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      await MerchantAdmin.create(
        {
          merchantId: newMerchant.id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          phone: admin.phone,
          password: hashedPassword,
        },
        { transaction }
      );
    }

    // 4. Ajout des points de vente
    for (const point of pointsOfSell) {
      await MerchantPointOfSell.create(
        {
          merchantId: newMerchant.id,
          urlLink: point.urlLink,
        },
        { transaction }
      );
    }

    // Si tout est OK, on commit la transaction
    await transaction.commit();

    return res.status(201).json({
      status: "success",
      message: "Le compte du marchand a été créé avec succès!.",
    });
  } catch (error) {
    // Si une erreur survient, on rollback la transaction
    await transaction.rollback();
    console.error(`ERROR CREATING MERCHANT: ${error}`);
    appendErrorLog(`ERROR CREATING MERCHANT: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la création du marchand.",
    });
  }
};

const updatePhoto = async (req, res) => {
  try {
    const { merchantId } = req.body;
    const host = req.get("host");
    const photo = req.file;

    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du marchand est requis.",
      });
    }

    if (!photo) {
      return res.status(400).json({
        status: "error",
        message: "La photo du marchand est requise.",
      });
    }

    const merchant = await Merchant.findOne({ where: { id: merchantId } });
    if (!merchant) {
      return res.status(400).json({
        status: "error",
        message: "Le compte du marchand n'existe pas.",
      });
    }

    let imageUrl = null;
    if (req.file) {
      const fileUrl = `merchants/${req.file.filename}`;
      imageUrl = `${req.protocol}://${host}/${fileUrl}`;
    }

    await Merchant.update({ photo: imageUrl }, { where: { id: merchantId } });
    return res.status(200).json({
      status: "success",
      message: "La photo du marchand a été mise à jour avec succès!.",
    });
  } catch (error) {
    console.error(`ERROR UPDATING PHOTO MERCHANT: ${error}`);
    appendErrorLog(`ERROR UPDATING PHOTO MERCHANT: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la mise a jour de la photo du marchand.",
    });
  }
};

module.exports = { create, updatePhoto };
