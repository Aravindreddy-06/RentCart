/**
 * src/routes/items.routes.ts
 * Items route definitions — all protected by the auth middleware.
 */

import { Router } from 'express';
import * as itemsController from '../controllers/items.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, itemsController.listItems);

export default router;
