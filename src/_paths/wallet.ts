// ========== WALLET ROUTES ==========

export enum WALLET_PATHS {
  PATH_PREFIX = 'wallet',

  // Routes utilisateur
  BALANCE = 'balance',
  DETAILS = '',
  SETTINGS = 'settings',
  RECHARGE = 'recharge',
  TRANSFER = 'transfer',
  TRANSACTIONS = 'transactions',
  TRANSACTION_BY_ID = 'transactions/:id',
  STATS = 'stats',

  // Routes administratives
  ADMIN_CREDIT = 'admin/credit/:userId',
  ADMIN_DEBIT = 'admin/debit/:userId',
  ADMIN_WALLET = 'admin/:userId',
}
