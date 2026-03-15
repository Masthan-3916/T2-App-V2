// src/routes/index.ts
import { Router, Request, Response } from 'express';
import passport from 'passport';
import { authenticate, authorize } from '../middleware/auth';
import * as auth from '../controllers/authController';
import * as users from '../controllers/usersController';
import * as drivers from '../controllers/driversController';
import * as vehicles from '../controllers/vehiclesController';
import * as orders from '../controllers/ordersController';
import * as dashboard from '../controllers/dashboardController';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validate';

const router = Router();

// ─── Health ──────────────────────────────────────────────────────────────────
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
const authRouter = Router();
authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
authRouter.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/error' }),
  auth.googleCallback
);
authRouter.post('/refresh', auth.refreshAccessToken);
authRouter.post('/logout', authenticate, auth.logout);
authRouter.get('/me', authenticate, auth.getMe);
router.use('/auth', authRouter);

// ─── Users ────────────────────────────────────────────────────────────────────
const usersRouter = Router();
usersRouter.get('/', authenticate, authorize('admin', 'dispatcher'), users.listUsers);
usersRouter.post('/',
  authenticate,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('role').isIn(['admin', 'dispatcher', 'driver']).withMessage('Invalid role'),
  ],
  validateRequest,
  users.createUser
);
usersRouter.get('/:id', authenticate, authorize('admin', 'dispatcher'), users.getUser);
usersRouter.patch('/:id',
  authenticate,
  authorize('admin'),
  [
    body('role').optional().isIn(['admin', 'dispatcher', 'driver']),
    body('status').optional().isIn(['active', 'inactive', 'suspended']),
  ],
  validateRequest,
  users.updateUser
);
usersRouter.delete('/:id', authenticate, authorize('admin'), users.deleteUser);
router.use('/users', usersRouter);

// ─── Drivers ─────────────────────────────────────────────────────────────────
const driversRouter = Router();
driversRouter.get('/', authenticate, authorize('admin', 'dispatcher'), drivers.listDrivers);
driversRouter.post('/',
  authenticate,
  authorize('admin', 'dispatcher'),
  [
    body('name').trim().notEmpty(),
    body('phone').trim().notEmpty(),
    body('license_number').trim().notEmpty(),
  ],
  validateRequest,
  drivers.createDriver
);
driversRouter.get('/:id', authenticate, drivers.getDriver);
driversRouter.patch('/:id', authenticate, authorize('admin', 'dispatcher'), drivers.updateDriver);
driversRouter.delete('/:id', authenticate, authorize('admin', 'dispatcher'), drivers.deleteDriver);
driversRouter.post('/:id/assign-vehicle',
  authenticate,
  authorize('admin', 'dispatcher'),
  [body('vehicle_id').notEmpty()],
  validateRequest,
  drivers.assignVehicle
);
driversRouter.patch('/:id/status',
  authenticate,
  authorize('admin', 'dispatcher'),
  [body('status').isIn(['active', 'inactive', 'on_trip'])],
  validateRequest,
  drivers.updateDriverStatus
);
driversRouter.post('/:id/location',
  authenticate,
  [
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
  ],
  validateRequest,
  drivers.updateLocation
);
driversRouter.get('/:id/location', authenticate, drivers.getDriverLocation);
driversRouter.get('/all/locations', authenticate, authorize('admin', 'dispatcher'), drivers.listAllDriversLocations);
router.use('/drivers', driversRouter);

// ─── Vehicles ─────────────────────────────────────────────────────────────────
const vehiclesRouter = Router();
vehiclesRouter.get('/', authenticate, authorize('admin', 'dispatcher'), vehicles.listVehicles);
vehiclesRouter.post('/',
  authenticate,
  authorize('admin', 'dispatcher'),
  [
    body('plate_number').trim().notEmpty(),
    body('capacity').isFloat({ min: 0 }),
    body('type').isIn(['bike', 'van', 'truck', 'car']),
  ],
  validateRequest,
  vehicles.createVehicle
);
vehiclesRouter.get('/:id', authenticate, vehicles.getVehicle);
vehiclesRouter.patch('/:id', authenticate, authorize('admin', 'dispatcher'), vehicles.updateVehicle);
vehiclesRouter.delete('/:id', authenticate, authorize('admin'), vehicles.deleteVehicle);
vehiclesRouter.post('/:id/assign-driver',
  authenticate,
  authorize('admin', 'dispatcher'),
  [body('driver_id').notEmpty()],
  validateRequest,
  vehicles.assignDriverToVehicle
);
router.use('/vehicles', vehiclesRouter);

// ─── Orders ───────────────────────────────────────────────────────────────────
const ordersRouter = Router();
ordersRouter.get('/', authenticate, orders.listOrders);
ordersRouter.post('/',
  authenticate,
  authorize('admin', 'dispatcher'),
  [
    body('pickup_location').trim().notEmpty(),
    body('drop_location').trim().notEmpty(),
  ],
  validateRequest,
  orders.createOrder
);
ordersRouter.get('/:id', authenticate, orders.getOrder);
ordersRouter.patch('/:id', authenticate, authorize('admin', 'dispatcher'), orders.updateOrder);
ordersRouter.patch('/:id/status',
  authenticate,
  [body('status').isIn(['assigned', 'in_transit', 'completed', 'cancelled'])],
  validateRequest,
  orders.updateOrderStatus
);
ordersRouter.post('/:id/assign-driver',
  authenticate,
  authorize('admin', 'dispatcher'),
  [body('driver_id').notEmpty()],
  validateRequest,
  orders.assignDriverToOrder
);
ordersRouter.get('/:id/timeline', authenticate, orders.getOrderTimeline);
router.use('/orders', ordersRouter);

// ─── Dashboard ────────────────────────────────────────────────────────────────
const dashboardRouter = Router();
dashboardRouter.get('/summary', authenticate, authorize('admin', 'dispatcher'), dashboard.getSummary);
dashboardRouter.get('/driver-utilization', authenticate, authorize('admin', 'dispatcher'), dashboard.getDriverUtilization);
dashboardRouter.get('/order-metrics', authenticate, authorize('admin', 'dispatcher'), dashboard.getOrderMetrics);
router.use('/dashboard', dashboardRouter);

export default router;
