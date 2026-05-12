import { Router } from 'express';
import { getAllPages, getPageBySlug } from '../services/pageService.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const pages = await getAllPages();

    res.json(
      pages.map((page) => ({
        slug: page.slug,
        title: page.title,
        route: page.route,
        updatedAt: page.updatedAt ?? null,
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const page = await getPageBySlug(req.params.slug);

    if (!page) {
      return res.status(404).json({ message: 'Page not found.' });
    }

    return res.json(page);
  } catch (error) {
    return next(error);
  }
});

export default router;

