import { Router } from "express";
import {
  addProductsToDb,
  downloadProductsCSV,
  getAllCategories,
  getAllProducts,
  getProductByCategory,
  getProductById,
  getProductsPaginated,
} from "../controllers/productController.js";

const router = Router();

// Route Express pour exécuter le script Puppeteer
router.get("/run-puppeteer", downloadProductsCSV);

router.post("/add-products", addProductsToDb);

router.get("/all", getAllProducts);

router.get("/paginate", getProductsPaginated);

router.get("/categories", getAllCategories);

router.get("/product/:id", getProductById);

router.get("/category/:category", getProductByCategory);

export default router;
