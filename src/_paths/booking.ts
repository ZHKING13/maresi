
export enum BOOKING_PATHS {
  PATH_PREFIX = 'bookings',

  // Routes utilisateur
  CREATE = '',
  MY_BOOKINGS = 'my-bookings',
  DETAILS = ':id',
  CANCEL = ':id/cancel',
  CALCULATE = 'calculate',
  INITIATE_PAYMENT = ':id/payment',

  // Routes host
  HOST_BOOKINGS = 'host/bookings',
  HOST_BOOKING_DETAILS = 'host/:id',
  HOST_CONFIRM = 'host/:id/confirm',
  HOST_REJECT = 'host/:id/reject',

  // Routes admin
  ADMIN_ALL = 'admin/all',
  ADMIN_STATS = 'admin/stats',
}
