# Système de Paiement CinetPay - Maresi

Ce document décrit l'implémentation du système de paiement intégré avec CinetPay pour l'application Maresi.

## 🚀 Fonctionnalités

### Moyens de Paiement Supportés

#### 📱 Mobile Money

- **Orange Money** : 100 FCFA - 1,500,000 FCFA
- **MTN Mobile Money** : 100 FCFA - 2,000,000 FCFA
- **Moov Money** : 100 FCFA - 1,000,000 FCFA

#### 💳 Cartes Bancaires

- **Visa** : 500 FCFA - 10,000,000 FCFA
- **Mastercard** : 500 FCFA - 10,000,000 FCFA

### Devises Supportées

- **XOF** - Franc CFA (Afrique de l'Ouest) _(par défaut)_
- **XAF** - Franc CFA (Afrique Centrale)
- **USD** - Dollar américain
- **EUR** - Euro

## 📋 Configuration

### Variables d'Environnement

```bash
# Configuration CinetPay
CINETPAY_ENABLED=true
CINETPAY_API_KEY=your_cinetpay_api_key
CINETPAY_SITE_ID=your_cinetpay_site_id
CINETPAY_SECRET_KEY=your_cinetpay_secret_key
CINETPAY_BASE_URL=https://api-checkout.cinetpay.com
CINETPAY_VERSION=v2
CINETPAY_WEBHOOK_SECRET=your_webhook_secret

# URLs de retour
CINETPAY_RETURN_BASE_URL=http://localhost:3001
CINETPAY_NOTIFY_BASE_URL=http://localhost:3000
BACKEND_BASE_URL=http://localhost:3000
```

## 🛠 API Endpoints

### Endpoints Utilisateur Authentifiés

```http
POST   /api/payments                           # Créer un paiement
GET    /api/payments/my-payments               # Mes paiements
GET    /api/payments/my-payments/:transactionId # Détail d'un paiement
GET    /api/payments/status/:transactionId     # Vérifier le statut
```

### Endpoints Admin

```http
GET    /api/payments/admin/all                 # Tous les paiements
GET    /api/payments/admin/:id                 # Paiement par ID
GET    /api/payments/admin/stats               # Statistiques
```

### Webhooks et Pages de Retour

```http
POST   /api/payments/webhook                   # Webhook CinetPay
GET    /api/payments/success/:transactionId    # Page de succès
GET    /api/payments/cancel/:transactionId     # Page d'annulation
```

### Endpoints Publics

```http
GET    /api/payments/methods                   # Méthodes disponibles
GET    /api/payments/providers/:provider/limits # Limites par provider
```

## 💻 Utilisation

### 1. Créer un Paiement

```typescript
// Exemple de création de paiement
const paymentData = {
  amount: 10000, // 10,000 FCFA
  currency: 'XOF',
  description: 'Achat produit XYZ',
  paymentMethod: 'MOBILE_MONEY',
  provider: 'ORANGE_MONEY',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  customerPhone: '+22507000000',
  returnUrl: 'https://myapp.com/success',
  channels: 'ORANGE_MONEY,MTN_MONEY',
};

const response = await fetch('/api/payments', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(paymentData),
});

const result = await response.json();
// Rediriger l'utilisateur vers result.paymentUrl
```

### 2. Vérifier le Statut

```typescript
const status = await fetch(`/api/payments/status/${transactionId}`, {
  headers: {
    Authorization: 'Bearer YOUR_JWT_TOKEN',
  },
});

const statusData = await status.json();
console.log(statusData.status); // PENDING, COMPLETED, FAILED, etc.
```

### 3. Gestion des Webhooks

Le système traite automatiquement les webhooks CinetPay pour :

- ✅ **Confirmer** les paiements réussis
- ❌ **Marquer** les paiements échoués
- ⏹️ **Traiter** les annulations

## 📊 Statuts de Paiement

| Statut       | Description            |
| ------------ | ---------------------- |
| `PENDING`    | En attente de paiement |
| `PROCESSING` | En cours de traitement |
| `COMPLETED`  | Paiement réussi ✅     |
| `FAILED`     | Paiement échoué ❌     |
| `CANCELLED`  | Paiement annulé ⏹️     |
| `EXPIRED`    | Paiement expiré ⏱️     |
| `REFUNDED`   | Paiement remboursé 💰  |

## 🔒 Sécurité

### Validation des Montants

- Vérification automatique des limites par provider
- Validation du format et de la devise
- Protection contre les montants invalides

### Authentification

- JWT requis pour les opérations utilisateur
- Contrôle d'accès basé sur les rôles (RBAC)
- Vérification de propriété des paiements

### Webhooks Sécurisés

- Validation des signatures CinetPay
- Logging complet des requêtes
- Protection contre le replay

## 🗃 Structure de Base de Données

### Table `Payment`

```sql
- id                    INT PRIMARY KEY
- transactionId         VARCHAR UNIQUE    -- Notre ID
- cinetPayTransactionId VARCHAR UNIQUE    -- ID CinetPay
- amount                DECIMAL(10,2)
- currency              ENUM
- status                ENUM
- paymentMethod         ENUM
- provider              ENUM
- userId                INT
- customerName          VARCHAR
- customerEmail         VARCHAR
- customerPhone         VARCHAR
- paymentUrl            VARCHAR
- cinetPayData          JSON
- metadata              JSON
- failureReason         VARCHAR
- initiatedAt           TIMESTAMP
- paidAt                TIMESTAMP
- created               TIMESTAMP
- updated               TIMESTAMP
```

### Table `PaymentWebhook`

```sql
- id                    INT PRIMARY KEY
- paymentId             INT
- cinetPayTransactionId VARCHAR
- eventType             VARCHAR
- rawPayload            JSON
- processed             BOOLEAN
- signature             VARCHAR
- receivedAt            TIMESTAMP
- processedAt           TIMESTAMP
```

## 🧪 Tests et Développement

### Tester les Webhooks

```bash
# Endpoint de test
POST /api/payments/webhook/test

# Payload d'exemple
{
  "cpm_trans_id": "TEST_123456789",
  "cpm_trans_status": "ACCEPTED",
  "cpm_amount": "10000",
  "signature": "test_signature"
}
```

### URLs de Test

```bash
# Succès
GET /api/payments/success/PAY_1234567890_1234

# Annulation
GET /api/payments/cancel/PAY_1234567890_1234
```

## 🚨 Gestion des Erreurs

### Codes d'Erreur Courants

- **400** - Montant invalide pour le provider
- **401** - Token d'authentification manquant
- **403** - Accès interdit au paiement
- **404** - Paiement/Transaction non trouvé(e)
- **409** - Conflit (ex: paiement déjà traité)
- **500** - Erreur CinetPay ou serveur

### Messages d'Erreur

```json
{
  "statusCode": 400,
  "message": "Le montant 50 XOF n'est pas valide pour ORANGE_MONEY",
  "error": "Bad Request"
}
```

## 📈 Monitoring et Logs

### Logs Automatiques

- ✅ Création de paiements
- 📥 Réception de webhooks
- 🔄 Synchronisation des statuts
- ❌ Erreurs et échecs

### Métriques Importantes

- Taux de succès des paiements
- Temps de traitement moyen
- Répartition par provider/méthode
- Volume de transactions

## 🔧 Maintenance

### Nettoyage des Données

- Archivage automatique des anciens webhooks
- Nettoyage des paiements expirés
- Sauvegarde des données de transaction

### Surveillance

- Monitoring des endpoints CinetPay
- Alertes sur les échecs de webhook
- Surveillance des temps de réponse

---

## 📞 Support

Pour toute question concernant l'intégration CinetPay :

- 📧 Email : support@cinetpay.com
- 📱 Téléphone : +225 XX XX XX XX
- 🌐 Documentation : https://docs.cinetpay.com
