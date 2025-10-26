export const PAYMENT_PATHS = {
  // Routes utilisateur
  CREATE_PAYMENT: '/payments',
  GET_MY_PAYMENTS: '/payments/my-payments',
  GET_MY_PAYMENT: '/payments/my-payments/:transactionId',
  CHECK_PAYMENT_STATUS: '/payments/status/:transactionId',

  // Routes admin
  GET_ALL_PAYMENTS: '/payments/admin/all',
  GET_PAYMENT_BY_ID: '/payments/admin/:id',
  GET_PAYMENT_STATS: '/payments/admin/stats',

  // Webhooks
  CINETPAY_WEBHOOK: '/payments/webhook',
  TEST_WEBHOOK: '/payments/webhook/test',

  // Pages de retour
  PAYMENT_SUCCESS: '/payments/success/:transactionId',
  PAYMENT_CANCEL: '/payments/cancel/:transactionId',

  // Informations publiques
  GET_PAYMENT_METHODS: '/payments/methods',
  GET_PROVIDER_LIMITS: '/payments/providers/:provider/limits',
} as const;
