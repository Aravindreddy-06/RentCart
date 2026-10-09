/**
 * src/controllers/items.controller.ts
 * Express route handler for the items endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import * as itemsService from '../services/items.service';
import { success } from '../utils/response';

export async function listItems(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, category, page, limit } = req.query;

    const result = await itemsService.getItems({
      search: typeof search === 'string' ? search : undefined,
      category: typeof category === 'string' ? category : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return success(res, result);
  } catch (err) {
    next(err);
  }
}
