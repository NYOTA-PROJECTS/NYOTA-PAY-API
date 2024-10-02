const bcrypt = require("bcrypt");
const {
  Merchant,
  MerchantAdmin,
  PointOfSale,
  MerchantBalance,
  Category,
  Worker,
  CashRegister,
  CashRegisterBalance,
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
      if (req.files["photo"]) {
        const photoFile = req.files["photo"][0];
        photoUrl = `${req.protocol}://${host}/merchants/${photoFile.filename}`;
      }
      if (req.files["cover"]) {
        const coverFile = req.files["cover"][0];
        coverUrl = `${req.protocol}://${host}/merchants/${coverFile.filename}`;
      }
    }

    // 1. Création du marchand
    const newMerchant = await Merchant.create(
      {
        name,
        categoryId,
        photo: photoUrl,
        cover: coverUrl,
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
          urlLink: point.link,
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

const updateCover = async (req, res) => {
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

    let coverUrl = null;
    if (req.file) {
      const fileUrl = `merchants/${req.file.filename}`;
      coverUrl = `${req.protocol}://${host}/${fileUrl}`;
    }

    await Merchant.update({ cover: coverUrl }, { where: { id: merchantId } });
    return res.status(200).json({
      status: "success",
      message:
        "La photo de couverture du marchand a été mise à jour avec succès!.",
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
      attributes: ["id", "name"],
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
      message:
        "Une erreur s'est produite lors de la création du compte admin du marchand.",
    });
  }
};

const recharge = async (req, res) => {
  try {
    const { merchantId, amount } = req.body;
    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du marchand est requis.",
      });
    }

    if (!amount) {
      return res.status(400).json({
        status: "error",
        message: "Le montant est requis.",
      });
    }

    const merchant = await Merchant.findOne({ where: { id: merchantId } });
    if (!merchant) {
      return res.status(400).json({
        status: "error",
        message: "Le compte du marchand n'existe pas.",
      });
    }
    // Calcul de la commission de 3,5%
    const commissionRate = 0.035;
    const commission = (parseFloat(amount) * commissionRate).toFixed(0);
    const amountAfterCommission = (parseFloat(amount) - commission).toFixed(0);

    // Mettre à jour le solde du marchand après déduction de la commission
    await MerchantBalance.update(
      { amount: sequelize.literal(`amount + ${amountAfterCommission}`) },
      { where: { merchantId } }
    );

    // Répondre avec succès
    return res.status(200).json({
      status: "success",
      message: `Le compte du marchand a bien été rechargé avec ${amountAfterCommission} FCFA après une déduction de commission de ${commission} FCFA.`,
    });
  } catch (error) {
    console.error(`ERROR RECHARGING MERCHANT: ${error}`);
    appendErrorLog(`ERROR RECHARGING MERCHANT: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la recharge du compte du marchand.",
    });
  }
};

const balanceAllMerchants = async (req, res) => {
  try {
    const totalBalance = await MerchantBalance.sum("amount");
    return res.status(200).json({
      status: "success",
      data: totalBalance || 0,
    });
  } catch (error) {
    console.error(`ERROR BALANCE ALL MERCHANTS: ${error}`);
    appendErrorLog(`ERROR BALANCE ALL MERCHANTS: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la recherche du solde de tous les marchands.",
    });
  }
};

const allMerchant = async (req, res) => {
  try {
    const merchants = await Merchant.findAll({
      include: [
        { model: MerchantAdmin }, // Inclusion des administrateurs
        {
          model: PointOfSale,
          include: [{ model: CashRegister, include: [CashRegisterBalance] }],
        }, // Inclusion des points de vente et des caisses avec leurs balances
      ],
    });

    // Préparer la réponse JSON
    const merchantDetails = merchants.map((merchant) => {
      // Calcul du nombre d'administrateurs et de points de vente
      const adminCount = merchant.MerchantAdmins
        ? merchant.MerchantAdmins.length
        : 0;
      const pointOfSaleCount = merchant.PointOfSales
        ? merchant.PointOfSales.length
        : 0;

      // Calcul du nombre total de caisses et du solde total des caisses pour chaque marchand
      let cashRegisterCount = 0;
      let totalCash = 0;

      if (merchant.PointOfSales) {
        merchant.PointOfSales.forEach((pointOfSale) => {
          if (pointOfSale.CashRegisters) {
            cashRegisterCount += pointOfSale.CashRegisters.length;

            pointOfSale.CashRegisters.forEach((cashRegister) => {
              if (cashRegister.CashRegisterBalance) {
                totalCash += cashRegister.CashRegisterBalance.amount;
              }
            });
          }
        });
      }

      return {
        marchand: merchant.name,
        administrateur: adminCount,
        pointDeVente: pointOfSaleCount,
        caisse: cashRegisterCount,
        balance: totalCash,
      };
    });

    return res.status(200).json({
      status: "success",
      data: merchantDetails,
    });
  } catch (error) {
    console.error(`ERROR ALL MERCHANTS: ${error}`);
    appendErrorLog(`ERROR ALL MERCHANTS: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la recherche de tous les marchands.",
    });
  }
};

const merchantDetails = async (req, res) => {
  try {
    const merchantId = req.headers.merchantid;
    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du marchand est requis.",
      });
    }

    // Récupérer les informations détaillées du marchand
    const merchant = await Merchant.findOne({
      where: { id: merchantId },
      include: [
        { model: MerchantAdmin }, // Inclusion des administrateurs
        {
          model: PointOfSale,
          include: [{ model: CashRegister, include: [CashRegisterBalance] }],
        }, // Points de vente + Caisse + Balance
        { model: Worker }, // Inclusion des travailleurs
      ],
    });

    // Si aucun marchand trouvé
    if (!merchant) {
      return res.status(404).json({
        status: "error",
        message: "Le marchand n'a pas été trouvé.",
      });
    }

    // Calcul des détails
    const adminCount = merchant.MerchantAdmins
      ? merchant.MerchantAdmins.length
      : 0;
    const pointOfSaleCount = merchant.PointOfSales
      ? merchant.PointOfSales.length
      : 0;

    let cashRegisterCount = 0;
    let totalCash = 0;

    // Itérer à travers les points de vente pour compter les caisses et totaliser le solde
    if (merchant.PointOfSales) {
      merchant.PointOfSales.forEach((pointOfSale) => {
        if (pointOfSale.CashRegisters) {
          cashRegisterCount += pointOfSale.CashRegisters.length;
          pointOfSale.CashRegisters.forEach((cashRegister) => {
            if (cashRegister.CashRegisterBalance) {
              totalCash += cashRegister.CashRegisterBalance.amount;
            }
          });
        }
      });
    }

    const workerCount = merchant.Workers ? merchant.Workers.length : 0;

    // Préparer la réponse JSON avec les détails demandés
    const merchantData = {
      balance: totalCash,
      admin: adminCount,
      pos: pointOfSaleCount,
      cashier: cashRegisterCount,
      user: workerCount,
    };

    return res.status(200).json({
      status: "success",
      data: merchantData,
    });
  } catch (error) {
    console.error(`ERROR MERCHANT DETAILS: ${error}`);
    appendErrorLog(`ERROR MERCHANT DETAILS: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la recherche des données du marchand.",
    });
  }
};

const allAdminMarchants = async (req, res) => {
  try {
    const merchantId = req.headers.merchantid;
    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du marchand est requis.",
      });
    }

    // Récupérer les administrateurs du marchand spécifique
    const merchantAdmins = await MerchantAdmin.findAll({
      where: { merchantId: merchantId }, // Filtrer par l'ID du marchand
      attributes: ["firstName", "lastName", "email", "phone"], // Sélectionner les attributs nécessaires
    });

    // Si aucun administrateur n'est trouvé
    if (!merchantAdmins || merchantAdmins.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Aucun administrateur trouvé pour ce marchand.",
      });
    }

    // Préparer la réponse JSON
    const adminDetails = merchantAdmins.map((admin) => ({
      name: `${admin.firstName} ${admin.lastName}`,
      email: admin.email,
      phone: admin.phone,
    }));

    return res.status(200).json({
      status: "success",
      data: adminDetails,
    });
  } catch (error) {
    console.error(`ERROR ALL ADMIN MERCHANTS: ${error}`);
    appendErrorLog(`ERROR ALL ADMIN MERCHANTS: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la recherche de tous les marchands.",
    });
  }
};

const destroyMerchantAdmin = async (req, res) => {
  try {
    const { merchantAdminId } = req.body;
    if (!merchantAdminId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant de l'administrateur est requis.",
      });
    }

    const merchantAdmin = await MerchantAdmin.findOne({
      where: { id: merchantAdminId },
    });
    if (!merchantAdmin) {
      return res.status(404).json({
        status: "error",
        message: "L'administrateur n'existe pas.",
      });
    }

    await MerchantAdmin.destroy({ where: { id: merchantAdminId } });

    return res.status(200).json({
      status: "success",
      message: "L'administrateur a été supprimé.",
    });
  } catch (error) {
    console.error(`ERROR DESTROY MERCHANT ADMIN: ${error}`);
    appendErrorLog(`ERROR DESTROY MERCHANT ADMIN: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la suppression de l'administrateur.",
    });
  }
};

const merchantCashier = async (req, res) => {
  try {
    const merchantId = req.headers.merchantid;

    // Vérification si l'ID du marchand est fourni
    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du marchand est requis.",
      });
    }

    // Récupérer les caisses enregistreuses (CashRegister) avec leurs soldes (CashRegisterBalance) et le lien du point de vente (PointOfSale)
    const cashRegisters = await CashRegister.findAll({
      where: { merchantId },
      attributes: ['name', 'minBalance'],
      include: [
        {
          model: CashRegisterBalance,
          attributes: ['amount'],
        },
        {
          model: PointOfSale,
          attributes: ['urlLink'],
        }
      ]
    });

    // Si aucune caisse enregistreuse n'est trouvée
    if (!cashRegisters || cashRegisters.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Aucune caisse enregistreuse trouvée pour ce marchand.",
      });
    }

    // Préparer la réponse JSON avec les informations récupérées
    const cashierDetails = cashRegisters.map(cashRegister => ({
      name: cashRegister.name,
      minAmount: cashRegister.minBalance,
      amount: cashRegister.CashRegisterBalance?.amount || 0,
      pos: cashRegister.PointOfSale?.urlLink || 'N/A', 
    }));

    return res.status(200).json({
      status: 'success',
      data: cashierDetails,
    });

  } catch (error) {
    console.error(`ERROR MERCHANT CASHIER: ${error}`);
    appendErrorLog(`ERROR MERCHANT CASHIER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la recherche des informations du marchand.",
    });
  }
}

const allCashregister = async (req, res) => {
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
      return res.status(404).json({
        status: "error",
        message: "Le compte du marchand n'existe pas.",
      });
    }
    
    const cashregisters = await CashRegister.findAll({
      where: { merchantId },
      attributes: ['id', 'name'],
    });
    
    if (!cashregisters || cashregisters.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Aucune caisse enregistreuse trouvée pour ce marchand.",
      });
    }
    
    const cashregisterDetails = cashregisters.map(cashregister => ({
      id: cashregister.id,
      name: cashregister.name,
    }));
    
    return res.status(200).json({
      status: 'success',
      data: cashregisterDetails,
    });
    
  } catch (error) {
    console.error(`ERROR ALL CASHREGISTER: ${error}`);
    appendErrorLog(`ERROR ALL CASHREGISTER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la recherche de tous les caisses enregistreuses.",
    });
  }
}

module.exports = {
  create,
  updatePhoto,
  updateCover,
  getAllInfos,
  createAdmin,
  recharge,
  balanceAllMerchants,
  allMerchant,
  merchantDetails,
  allAdminMarchants,
  destroyMerchantAdmin,
  merchantCashier,
  allCashregister,
};
