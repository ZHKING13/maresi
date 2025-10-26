# Système de Logging des Notifications

Le système de notification inclut un mécanisme complet de traçage et de gestion des logs pour toutes les notifications envoyées.

## ✨ Fonctionnalités

- **📝 Traçage automatique** : Toutes les notifications sont automatiquement enregistrées
- **📊 Statistiques détaillées** : Taux de succès, temps de livraison, répartition par type/statut
- **🔍 Recherche avancée** : Filtrage par utilisateur, type, statut, période
- **🧹 Nettoyage automatique** : Suppression des anciens logs selon la politique de rétention
- **⚙️ Configuration flexible** : Durée de rétention configurable via backoffice
- **📤 Export CSV** : Export des logs pour analyse externe
- **🎛️ Interface backoffice** : Endpoints API pour administration

## 🗃️ Structure des Logs

Chaque notification génère un log avec les informations suivantes :

```typescript
interface INotificationLog {
  id: string; // UUID unique
  type: NotificationType; // EMAIL | SMS | FCM | PUSH_IN_APP
  status: NotificationStatus; // PENDING | SENT | DELIVERED | FAILED | READ
  priority: NotificationPriority; // LOW | MEDIUM | HIGH | URGENT

  // Informations destinataire
  recipientUserId?: number;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;

  // Contenu notification
  subject?: string;
  content: string;
  templateId?: string;
  variables?: Record<string, any>;

  // Réponse provider
  messageId?: string;
  providerResponse?: Record<string, any>;
  errorMessage?: string;

  // Horodatage
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  expiresAt?: Date;

  // Métadonnées
  metadata?: Record<string, any>;
  retryCount: number;
  maxRetries: number;

  created: Date;
  updated: Date;
}
```

## 🚀 Configuration

### Variables d'environnement

```bash
# Logging des notifications
NOTIFICATION_LOGGING_ENABLED=true           # Activer/désactiver le logging
NOTIFICATION_LOG_RETENTION_DAYS=90          # Durée de rétention (jours)
NOTIFICATION_LOG_CLEANUP_INTERVAL=24        # Fréquence nettoyage (heures)
```

### Configuration programmatique

```typescript
// Dans votre service
constructor(private notificationService: NotificationService) {}

// Configurer la rétention
await this.notificationService.updateRetentionSettings({
  logRetentionDays: 180,      // 6 mois
  cleanupInterval: 12,        // Toutes les 12h
  archiveOldLogs: true,
  archiveAfterDays: 365,
});
```

## 📊 API Endpoints

### Consultation des logs

```bash
# Obtenir tous les logs (avec pagination)
GET /notifications/logs?limit=50&offset=0&sortBy=created&sortOrder=desc

# Filtrer par utilisateur
GET /notifications/logs?userId=123

# Filtrer par type et statut
GET /notifications/logs?type=EMAIL&status=SENT

# Filtrer par période
GET /notifications/logs?startDate=2025-01-01&endDate=2025-01-31

# Logs d'un utilisateur spécifique
GET /notifications/logs/user/123
```

### Statistiques

```bash
# Statistiques générales
GET /notifications/logs/stats

# Statistiques sur une période
GET /notifications/logs/stats?startDate=2025-01-01&endDate=2025-01-31
```

**Réponse exemple :**

```json
{
  "total": 1547,
  "byType": {
    "EMAIL": 892,
    "SMS": 345,
    "FCM": 198,
    "PUSH_IN_APP": 112
  },
  "byStatus": {
    "SENT": 1423,
    "FAILED": 89,
    "DELIVERED": 1234,
    "READ": 567
  },
  "byPriority": {
    "HIGH": 123,
    "MEDIUM": 1234,
    "LOW": 190
  },
  "successRate": 92,
  "averageDeliveryTime": 2.5
}
```

### Export des données

```bash
# Export CSV
GET /notifications/logs/export?startDate=2025-01-01&endDate=2025-01-31
```

### Gestion de la rétention

```bash
# Obtenir la configuration actuelle
GET /notifications/settings/retention

# Mettre à jour la configuration
PUT /notifications/settings/retention
{
  \"logRetentionDays\": 180,
  \"cleanupInterval\": 12,
  \"archiveOldLogs\": true,
  \"archiveAfterDays\": 365
}

# Déclencher un nettoyage manuel
POST /notifications/logs/cleanup
```

## 🔍 Utilisation Pratique

### 1. Surveillance des Notifications

```typescript
// Obtenir les échecs des dernières 24h
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const { logs } = await this.notificationService.getNotificationLogs({
  status: NotificationStatus.FAILED,
  startDate: yesterday,
  limit: 100,
});

console.log(`${logs.length} notifications échouées dans les dernières 24h`);
```

### 2. Analyse des Performances

```typescript
// Stats du mois en cours
const startOfMonth = new Date();
startOfMonth.setDate(1);

const stats = await this.notificationService.getNotificationStats(
  startOfMonth,
  new Date(),
);

console.log(`Taux de succès du mois : ${stats.successRate}%`);
console.log(`Temps moyen de livraison : ${stats.averageDeliveryTime} minutes`);
```

### 3. Audit Utilisateur

```typescript
// Historique complet d'un utilisateur
const { logs, total } = await this.notificationService.getNotificationLogs({
  userId: 123,
  sortBy: 'created',
  sortOrder: 'desc',
  limit: 50,
});

console.log(`${total} notifications envoyées à cet utilisateur`);
```

## 🧹 Nettoyage Automatique

Le système inclut un nettoyage automatique qui :

1. **S'exécute quotidiennement** à 2h du matin
2. **Supprime les logs** plus anciens que la durée de rétention
3. **Log les opérations** de nettoyage
4. **Respecte la configuration** dynamique

### Nettoyage Manuel

```typescript
// Déclencher un nettoyage immédiat
await this.notificationService.cleanupOldLogs();
```

## 🔒 Sécurité et Performance

### Bonnes Pratiques

1. **Limitation des requêtes** : Les endpoints sont limités à 50-100 résultats par défaut
2. **Index de base de données** : Index sur `type`, `status`, `recipientUserId`, `created`, `expiresAt`
3. **Nettoyage en arrière-plan** : Le nettoyage s'exécute hors heures de pointe
4. **Données sensibles** : Les mots de passe et tokens ne sont jamais loggés

### Configuration Recommandée

```bash
# Production
NOTIFICATION_LOG_RETENTION_DAYS=90   # 3 mois minimum
NOTIFICATION_LOG_CLEANUP_INTERVAL=24 # Nettoyage quotidien

# Développement
NOTIFICATION_LOG_RETENTION_DAYS=30   # 1 mois suffit
NOTIFICATION_LOG_CLEANUP_INTERVAL=24 # Test du nettoyage
```

## 📈 Monitoring et Alertes

### Métriques Importantes

1. **Taux d'échec élevé** : > 5% sur 1h
2. **Temps de livraison** : > 5 minutes en moyenne
3. **Volume anormal** : +200% par rapport à la moyenne
4. **Erreurs de provider** : Accumulation d'erreurs spécifiques

### Exemple d'Alerte

```typescript
// Vérifier les performances horaires
const lastHour = new Date();
lastHour.setHours(lastHour.getHours() - 1);

const stats = await this.notificationService.getNotificationStats(
  lastHour,
  new Date(),
);

if (stats.successRate < 95) {
  // Déclencher une alerte
  console.warn(`Taux de succès faible : ${stats.successRate}%`);
}
```

## 🎛️ Interface Backoffice

Le système peut être intégré dans une interface d'administration pour :

- **📊 Dashboard** : Graphiques de performance en temps réel
- **🔍 Recherche** : Interface de recherche avancée dans les logs
- **⚙️ Configuration** : Modification de la rétention et des paramètres
- **📤 Export** : Génération de rapports CSV/Excel
- **🚨 Alertes** : Configuration d'alertes sur les métriques

### Exemple d'intégration React

```typescript
// Hook pour récupérer les stats
const useNotificationStats = (period: DateRange) => {
  return useQuery({
    queryKey: ['notification-stats', period],
    queryFn: () => api.get('/notifications/logs/stats', { params: period }),
  });
};

// Composant Dashboard
function NotificationDashboard() {
  const { data: stats } = useNotificationStats({
    startDate: startOfMonth,
    endDate: new Date()
  });

  return (
    <div>
      <StatCard title="Taux de succès" value={`${stats.successRate}%`} />
      <StatCard title="Total envoyé" value={stats.total} />
      <StatCard title="Temps moyen" value={`${stats.averageDeliveryTime}min`} />
    </div>
  );
}
```

## 🚀 Évolutions Futures

- **📱 Notifications temps réel** : WebSocket pour les logs en direct
- **🤖 IA/ML** : Détection d'anomalies automatique
- **📊 Analytics avancés** : Segmentation utilisateurs, A/B testing
- **🔄 Retry intelligent** : Retry avec backoff exponentiel
- **📦 Archivage** : Archivage automatique des anciens logs

---

Le système de logging offre une visibilité complète sur toutes les notifications, permettant un monitoring proactif et une amélioration continue de la fiabilité des communications.
