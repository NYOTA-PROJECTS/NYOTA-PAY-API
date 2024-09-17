# API NYOTA PAY
## PORT:`6880`

## ADMIN
<details>
<summary>REQUEST</summary>
<br>

### Login
- **URL**: `/api/v1/admin/login`
- **Méthode**: `POST`
- **Description**: Connexion de l'admin.
- **Body**:
    - `email` (string): Email.
    - `password` (string): Mot de passe.

</details>

## CATEGORIES
<details>
<summary>REQUEST</summary>
<br>

### RECUPERATION DES CATÉGORIES
- **URL**: `/api/v1/category/all`
- **Méthode**: `GET`
- **Description**: Récupération de la liste des catégories.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.

</details>

## MARCHANTS
<details>
<summary>REQUEST</summary>
<br>

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
  "cover": "Image de couverture du marchant",
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

### CRÉATION COMPTE ADMIN DU MARCHANT
- **URL**: `/api/v1/merchant/create-admin`
- **Méthode**: `POST`
- **Description**: Création d'un compte admin marchant.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
- **Body**:
    - `merchantId` (string): Identifiant du marchant.
    - `firstname` (string): Prénom de l'admin du marchant.
    - `lastname` (string): Nom de l'admin du marchant.
    - `email` (string): Email de l'admin du marchant.
    - `phone` (string): Téléphone de l'admin marchant.
    - `password` (string): Mot de passe de l'admin du marchant.


### MISE À JOUR DE LA PHOTO DU MARCHANT
- **URL**: `/api/v1/merchant/update-photo`
- **Méthode**: `PUT`
- **Description**: Mise à jours de la photo du marchant.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
- **Body**:
    - `photo` (file): Image du marchant.
    - `merchantId` (string): Identifiant du marchant.


### MISE À JOUR DE LA PHOTO DE COUVERTURE DU MARCHANT
- **URL**: `/api/v1/merchant/update-cover`
- **Méthode**: `PUT`
- **Description**: Mise à jours de la photo de couverture du marchant.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
- **Body**:
    - `cover` (file): Image de couverture du marchant.
    - `merchantId` (string): Identifiant du marchant.


### RECUPERATION DE LA LISTE DES MARCHANTS
- **URL**: `/api/v1/merchant/all-details`
- **Méthode**: `GET`
- **Description**: Récupération de la liste des marchants.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.

</details>



## CAISSE

<details>
<summary>REQUEST</summary>
<br>

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

</details>


## POINT DE VENTE

<details>
<summary>REQUEST</summary>
<br>

### RÉCUPERATION DE LA LISTE DES POINTS DE VENTE
- **URL**: `/api/v1/pointofsell/list`
- **Méthode**: `GET`
- **Description**: Suppréssion d'un marchant.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
    - `merchantid` (string): Identifiant du marchant.

</details>


## UTILISATEURS

<details>
<summary>REQUEST</summary>
<br>

### CRÉATION DU COMPTE UTILISATEUR
- **URL**: `/api/v1/worker/create`
- **Méthode**: `POST`
- **Description**: Création du compte utilisateur.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
- **Body**:
    - `name` (string): Nom de l'utilisateur.
    - `phone` (string): Numéro de telephone de l'utilisateur.
    - `password` (string): Mot de passe de l'utilisateur(minimum 4 charactères).


### SUPPRESSION D'UN UTILISATEUR
- **URL**: `/api/v1/worker/delete`
- **Méthode**: `DELETE`
- **Description**: Suppréssion d'un utilisateur.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
- **Body**:
    - `workerId` (string): Identifiant de l'utilisateur.


### DESACTIVATION D'UN COMPTE UTILISATEUR
- **URL**: `/api/v1/worker/disable-account`
- **Méthode**: `PUT`
- **Description**: Désactivation d'un compte utilisateur.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
- **Body**:
    - `workerId` (string): Identifiant de l'utilisateur.


### ACTIVCATION D'UN COMPTE UTILISATEUR
- **URL**: `/api/v1/worker/activate-account`
- **Méthode**: `PUT`
- **Description**: Activation d'un compte utilisateur.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
- **Body**:
    - `workerId` (string): Identifiant de l'utilisateur.


### MISE À JOUR MOT DE PASSE D'UN UTILISATEUR
- **URL**: `/api/v1/worker/update-password`
- **Méthode**: `PUT`
- **Description**: Mise à jours du mot de passe d'un utilisateur.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.
- **Body**:
    - `workerId` (string): Identifiant de l'utilisateur.
    - `password` (string): Le nouveau mot de passe de l'utilisateur.


### LISTE DE TOUS LES UTILISATEURS
- **URL**: `/api/v1/worker/all`
- **Méthode**: `GET`
- **Description**: Mise à jours du mot de passe d'un utilisateur.
- **Header**:
    - `Authorization` (string): Token Bearer de l'admin.

</details>