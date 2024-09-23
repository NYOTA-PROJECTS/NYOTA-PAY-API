'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Categories', [
      {
        id: 1,
        name: 'Accessoires de mode',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: 'Alimentation et boissons',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        name: 'Animaux de compagnie',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 4,
        name: 'Antiquités et objets de collection',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 5,
        name: 'Art et artisanat',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 6,
        name: 'Auto, moto et pièces détachées',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 7,
        name: 'Beauté et soins personnels',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 8,
        name: 'Bijoux et montres',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 9,
        name: 'Bricolage et jardinage',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 10,
        name: 'Cadeaux et occasions spéciales',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 11,
        name: 'Chaussures',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 12,
        name: 'Électronique et électroménager',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 13,
        name: 'Événements et divertissements',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 14,
        name: 'Fleurs et plantes',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 15,
        name: 'Fournitures de bureau',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 16,
        name: 'Fournitures pour la maison',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 17,
        name: 'Informatique et logiciels',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 18,
        name: 'Jeux et jouets',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 19,
        name: 'Livres, films et musique',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 20,
        name: 'Matériel sportif et activités de plein air',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 21,
        name: 'Meubles et décoration',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 22,
        name: 'Mode et habillement',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 23,
        name: 'Pharmacie et santé',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 24,
        name: 'Produits pour bébés et enfants',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 25,
        name: 'Restaurants et alimentation',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 26,
        name: 'Services financiers',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 27,
        name: 'Services professionnels',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 28,
        name: 'Télécommunications',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 29,
        name: 'Tourisme et voyages',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 30,
        name: 'Transport et logistique',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Categories', null, {});
  }
};
