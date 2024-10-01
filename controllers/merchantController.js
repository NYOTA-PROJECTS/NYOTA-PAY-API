const bcrypt = require("bcrypt");
const {
  Merchant,
  MerchantAdmin,
  PointOfSale,
  MerchantBalance,
  Category,
  Worker,
} = require("../models");
const { sequelize } = require("../models");
const { appendErrorLog } = require("../utils/logging");

const create = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { name, categoryId, admins, pointsOfSell } = req.body;
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

    // Récupérer les fichiers téléchargés
    let photoUrl = null;
    let coverUrl = null;

    if (req.files) {
      if (req.files['photo']) {
        const photoFile = req.files['photo'][0];
        photoUrl = `${req.protocol}://${host}/merchants/${photoFile.filename}`;
      }
      if (req.files['cover']) {
        const coverFile = req.files['cover'][0];
        coverUrl = `${req.protocol}://${host}/merchants/${coverFile.filename}`;
      }
    }

    // 1. Création du marchand
    const newMerchant = await Merchant.create(
      {
        name,
        categoryId,
        photo: photoUrl,
        cover: coverUrl
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
      await PointOfSale.create(
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

const updateCover = async (req, res) => {
  try {
    const { merchantId } = req.body;
    const host = req.get("host");

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

    let coverUrl = null;
    if (req.file) {
      const fileUrl = `merchants/${req.file.filename}`;
      coverUrl = `${req.protocol}://${host}/${fileUrl}`;
    }

    await Merchant.update({ cover: coverUrl }, { where: { id: merchantId } });
    return res.status(200).json({
      status: "success",
      message: "La photo de couverture du marchand a été mise à jour avec succès!.",
    });
  } catch (error) {
    console.error(`ERROR UPDATING COVER MERCHANT: ${error}`);
    appendErrorLog(`ERROR UPDATING COVER MERCHANT: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la mise a jour de la photo de couverture du marchand.",
    });
  }
};

const getAllInfos = async (req, res) => {
  try {
    const merchants = await Merchant.findAll({
      attributes: ["id", "name",],
      include: [
        {
          model: PointOfSale,
          attributes: ["urlLink"],
        },
        {
          model: MerchantBalance,
          attributes: ["amount"],
        },
        {
          model: Worker,
          attributes: ["id", "merchantId", "name", "phone"],
        },
      ],
      order: [["name", "ASC"]],
    });

    const merchantInfos = merchants.map((merchant) => {
      return {
        id: merchant.id,
        name: merchant.name,
        pointsOfSell: merchant.PointOfSale,
        workers: merchant.Worker,
        balance: merchant.MerchantBalance,
      };
    });

    return res.status(200).json({
      status: "success",
      data: merchants,
    });
  } catch (error) {
    console.error(`ERROR GETTING ALL INFOS MERCHANT: ${error}`);
    appendErrorLog(`ERROR GETTING ALL INFOS MERCHANT: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la recupération des informations des marchands.",
    });
  }
};

const createAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { merchantId, firstname, lastname, email, phone, password } =
      req.body;

    if (!firstname) {
      return res.status(400).json({
        status: "error",
        message: "Le prénom est requis.",
      });
    }

    if (!lastname) {
      return res.status(400).json({
        status: "error",
        message: "Le nom est requis.",
      });
    }

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "L'email est requis.",
      });
    }

    if (!password) {
      return res.status(400).json({
        status: "error",
        message: "Le mot de passe est requis.",
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        status: "error",
        message: "Le mot de passe doit avoir minimum 4 charactères.",
      });
    }

    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du marchant est requis.",
      });
    }

    const admin = await MerchantAdmin.findOne(
      { where: { email, merchantId } },
      { transaction }
    );
    if (!admin) {
      return res.status(400).json({
        status: "error",
        message: "Le marchant n'à pas été trouvé ou n'existe pas.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await MerchantAdmin.create(
      {
        merchantId,
        firstName: firstname,
        lastName: lastname,
        email,
        phone,
        password: hashedPassword,
      },
      { transaction }
    );
    await transaction.commit();

    return res.status(201).json({
      status: "success",
      message: "le compte admin du marchant a bien été crée aavec succès!.",
    });
  } catch (error) {
    await transaction.rollback();
    console.error(`ERROR CREATING MERCHANT ADMIN: ${error}`);
    appendErrorLog(`ERROR CREATING MERCHANT ADMIN: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la création du compte admin du marchand.",
    });
  }
};

module.exports = { create, updatePhoto, updateCover, getAllInfos, createAdmin };
