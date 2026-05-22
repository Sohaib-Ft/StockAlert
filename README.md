# 📦 StockAlert — Système de Gestion de Stock (Microservices)

> Système complet de gestion de stock basé sur une architecture microservices avec Node.js, MongoDB, RabbitMQ, JWT et Docker.

---

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Client    │────▶│   auth-service   │     │ product-service  │
│  (Postman)  │────▶│     :4001        │     │     :4002        │
│             │────▶│                  │     │                  │
└─────────────┘     └──────────────────┘     └──────────────────┘
       │                                            ▲
       │            ┌──────────────────┐            │ HTTP GET
       └───────────▶│  stock-service   │────────────┘
                    │     :4003        │
                    │                  │──── Publish ────┐
                    └──────────────────┘                 │
                                                   ┌────▼─────┐
                    ┌──────────────────┐            │ RabbitMQ │
                    │  alert-service   │◀── Consume─│  :5672   │
                    │     :4004        │            └──────────┘
                    └──────────────────┘
```

### Services

| Service | Port | Responsabilité | Base de données |
|---------|------|---------------|-----------------|
| **auth-service** | 4001 | Inscription, connexion, JWT | `auth-db` |
| **product-service** | 4002 | CRUD catalogue produits | `product-db` |
| **stock-service** | 4003 | Mouvements entrée/sortie, alertes RabbitMQ | `stock-db` |
| **alert-service** | 4004 | Consommation et consultation des alertes | `alert-db` |

### Stack Technique

- **Runtime** : Node.js 22 + Express.js
- **Base de données** : MongoDB 7 (Mongoose ODM)
- **Message Broker** : RabbitMQ 3 (amqplib)
- **Authentification** : JWT (jsonwebtoken + bcryptjs)
- **Conteneurisation** : Docker + Docker Compose

---

## 🚀 Démarrage Rapide

### Prérequis

- [Docker](https://www.docker.com/get-started) et Docker Compose installés
- [Postman](https://www.postman.com/downloads/) (optionnel, pour les tests)

### Lancer le projet

```bash
# Cloner et se placer dans le répertoire
cd cloud-native

# Lancer tous les services
docker-compose up --build -d

# Vérifier que tout est démarré
docker-compose ps
```

### Vérifier les services

```bash
# Health checks
curl http://localhost:4001/health  # auth-service
curl http://localhost:4002/health  # product-service
curl http://localhost:4003/health  # stock-service
curl http://localhost:4004/health  # alert-service
```

### Interface RabbitMQ

Accéder à l'interface de gestion : [http://localhost:15672](http://localhost:15672)
- **Utilisateur** : guest
- **Mot de passe** : guest

---

## 📡 API Endpoints

### Auth Service (`:4001`)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | ❌ | Inscription |
| POST | `/api/auth/login` | ❌ | Connexion → JWT |
| GET | `/api/auth/me` | ✅ | Profil utilisateur |

### Product Service (`:4002`)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/products` | ✅ | Créer un produit |
| GET | `/api/products` | ✅ | Lister les produits |
| GET | `/api/products/:id` | ✅ | Détail d'un produit |
| PUT | `/api/products/:id` | ✅ | Modifier un produit |
| DELETE | `/api/products/:id` | ✅ | Supprimer un produit |

### Stock Service (`:4003`)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/stock/entry` | ✅ | Entrée de stock |
| POST | `/api/stock/exit` | ✅ | Sortie de stock (déclenche alerte si < seuil) |
| GET | `/api/stock/level/:productId` | ✅ | Niveau de stock d'un produit |
| GET | `/api/stock/levels` | ✅ | Tableau de bord (tous les niveaux) |
| GET | `/api/stock/movements/:productId` | ✅ | Historique d'un produit |
| GET | `/api/stock/movements` | ✅ | Historique complet |

### Alert Service (`:4004`)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/alerts` | ✅ | Toutes les alertes |
| GET | `/api/alerts/unread` | ✅ | Alertes non lues |
| PUT | `/api/alerts/:id/read` | ✅ | Marquer comme lue |
| PUT | `/api/alerts/read-all` | ✅ | Marquer toutes comme lues |

---

## 🧪 Tests Postman

### Importer la collection

1. Ouvrir Postman
2. Cliquer sur **Import**
3. Sélectionner le fichier `postman/StockAlert.postman_collection.json`

### Scénario de test complet

Exécuter les requêtes **dans l'ordre** :

1. **Register** → Créer l'utilisateur admin
2. **Login** → Le token JWT est sauvegardé automatiquement
3. **Create Product** → Clavier Mécanique (seuil minimum = 5)
4. **Stock Entry** → +20 unités (stock = 20)
5. **Check Stock** → Vérifier stock = 20, status = OK
6. **Stock Exit** → -17 unités (stock = 3 < seuil 5) → **Alerte RabbitMQ déclenchée !**
7. **Check Stock** → Vérifier stock = 3, status = CRITIQUE
8. **Get Alerts** → Vérifier l'alerte automatique
9. **Mark Alert Read** → Marquer l'alerte comme lue

Chaque requête contient des **tests automatisés** qui valident les résultats.

---

## 🔄 Flux RabbitMQ (Alertes)

```
stock-service                    RabbitMQ                     alert-service
     │                              │                              │
     │  Stock Exit (qty < seuil)    │                              │
     │──── publish ─────────────────▶                              │
     │    Exchange: stock_alerts    │                              │
     │    (fanout, durable)         │                              │
     │                              │──── consume ────────────────▶│
     │                              │   Queue: stock_low_alerts    │
     │                              │                              │
     │                              │                    Enregistre │
     │                              │                    Alert en DB│
```

---

## 🛑 Arrêter le projet

```bash
# Arrêter tous les conteneurs
docker-compose down

# Arrêter et supprimer les volumes (reset données)
docker-compose down -v
```

---

## 📁 Structure du projet

```
cloud-native/
├── auth-service/
│   ├── src/
│   │   ├── controllers/authController.js
│   │   ├── middleware/authMiddleware.js
│   │   ├── models/User.js
│   │   ├── routes/authRoutes.js
│   │   └── app.js
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── product-service/
│   ├── src/
│   │   ├── controllers/productController.js
│   │   ├── middleware/authMiddleware.js
│   │   ├── models/Product.js
│   │   ├── routes/productRoutes.js
│   │   └── app.js
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── stock-service/
│   ├── src/
│   │   ├── controllers/stockController.js
│   │   ├── middleware/authMiddleware.js
│   │   ├── models/Movement.js
│   │   ├── routes/stockRoutes.js
│   │   ├── services/rabbitPublisher.js
│   │   └── app.js
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── alert-service/
│   ├── src/
│   │   ├── controllers/alertController.js
│   │   ├── middleware/authMiddleware.js
│   │   ├── models/Alert.js
│   │   ├── routes/alertRoutes.js
│   │   ├── services/rabbitConsumer.js
│   │   └── app.js
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── postman/
│   └── StockAlert.postman_collection.json
├── docker-compose.yml
├── .env
└── README.md
```
