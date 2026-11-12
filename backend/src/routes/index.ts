import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import productRoutes from './productRoutes.js';
import promoRoutes from './promoRoutes.js';
import promoTypeRoutes from './promoTypeRoutes.js';
import approvalRoutes from './approvalRoutes.js';
import auditRoutes from './auditRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import headReviewRoutes from './headReviewRoutes.js';
import approvedPromoRoutes from './approvedPromoRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import salesRoutes from './salesRoutes.js';
import { checkIntegrationsHealth } from '../controllers/healthController.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/head-review', headReviewRoutes);
apiRouter.use('/approved-promos', approvedPromoRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/departments', departmentRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/sales', salesRoutes);
apiRouter.use('/promos', promoRoutes);
apiRouter.use('/promo-lists', promoRoutes);
apiRouter.use('/promo-types', promoTypeRoutes);
apiRouter.use('/approvals', approvalRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/audit', auditRoutes);

// External API integrations health check
apiRouter.get('/health/integrations', checkIntegrationsHealth);

export default apiRouter;
