# API NYOTA PAY
## PORT:`6880`

## ADMIN

### Login
- **URL**: `/api/v1/admin/login`
- **Méthode**: `POST`
- **Description**: Connexion de l'admin.
- **Body**:
    - `email` (string): Email.
    - `password` (string): Mot de passe.

## CATEGORIES

### RECUPERATION DES CATÉGORIES
- **URL**: `/api/v1/category/all`
- **Méthode**: `GET`
- **Description**: Récupération de la liste des catégories.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.


## MARCHANTS

### CRÉATION DU COMPTE MARCHANT
- **URL**: `/api/v1/merchant/create`
- **Méthode**: `POST`
- **Description**: Création du compte du marchant.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
- **Body**:
```json
{
  "name": "Marchandn Test",
  "categoryId": 1,
  "photo": "Image du marchant",
  "admins": [
    {
      "firstName": "Prénom Admin",
      "lastName": "Nom Admin",
      "email": "admin@example.com",
      "phone": "1234567890",
      "password": "123456789"
    }
  ],
  "pointsOfSell": [
    {
      "urlLink": "http://example.com/point-of-sell-1"
    },
    {
      "urlLink": "http://example.com/point-of-sell-2"
    }
  ]
}
```

### MISE À JOUR DE LA PHOTO DU MARCHANT
- **URL**: `/api/v1/merchant/update-photo`
- **Méthode**: `PUT`
- **Description**: Mise à jours de la photo du marchant.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
- **Body**:
    - `photo` (file): Image du marchant.
    - `merchantId` (string): Identifiant du marchant.

### RECUPERATION DE LA LISTE DES MARCHANTS
- **URL**: `/api/v1/merchant/all-details`
- **Méthode**: `GET`
- **Description**: Récupération de la liste des marchants.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.

## CAISSE

### CRÉATION D'UNE CAISSE
- **URL**: `/api/v1/cashregister/create`
- **Méthode**: `POST`
- **Description**: Récupération de la liste des marchants.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
- **Body**:
    - `merchantId` (file): Identifiant du marchant.
    - `posId` (string): Identifiant du point de vente.
    - `name` (string): Nom de la caisse.
    - `amount` (string): Montant minimum du seuil d'alert.

### SUPPRESSION D'UNE CAISSE
- **URL**: `/api/v1/cashregister/delete`
- **Méthode**: `DELETE`
- **Description**: Suppréssion d'un marchant.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
- **Body**:
    - `cashregisterId` (string): Identifiant de la caisser.

## POINT DE VENTE

### RÉCUPERATION DE LA LISTE DES POINTS DE VENTE
- **URL**: `/api/v1/pointofsell/list`
- **Méthode**: `GET`
- **Description**: Suppréssion d'un marchant.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
    - `merchantid` (string): Identifiant du marchant.