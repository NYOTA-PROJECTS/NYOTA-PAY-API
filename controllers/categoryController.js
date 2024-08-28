const { Category } = require("../models");
const { appendErrorLog } = require("../utils/logging");

const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Le nom de la catégorie est requis.",
      });
    }
    const existingCategory = await Category.findOne({ where: { name } });
    if (existingCategory) {
      return res.status(400).json({
        status: "error",
        message: "La catégorie existe déjà.",
      });
    }
    await Category.create({ name });

    return res.status(201).json({
      status: "success",
      message: "Catégorie crée avec succès.",
    });
  } catch (error) {
    console.error(`ERROR CREATING CATEGORY: ${error}`);
    appendErrorLog(`ERROR CREATING CATEGORY: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la création de la catégorie.",
    });
  }
};

const getAll = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ["id", "name"],
    });
    return res.status(200).json({
      status: "success",
      data: categories,
    });
  } catch (error) {
    console.error(`ERROR GETTING CATEGORIES: ${error}`);
    appendErrorLog(`ERROR GETTING CATEGORIES: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la récupération des catégories.",
    });
  }
};

module.exports = { create, getAll };
