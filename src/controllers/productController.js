import fs from "fs";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import path from "path";
import iconv from "iconv-lite";
import csvParser from "csv-parser";

const prisma = new PrismaClient();

export const downloadProductsCSV = async (req, res) => {
  const downloadPath = path.join(process.cwd(), "stocks_fr_2.csv"); // Chemin de sauvegarde du fichier
  const productsPath = path.join(process.cwd(), "products", "stocks_fr_2.json");

  try {
    // Télécharger le fichier CSV
    const response = await axios({
      url: "https://www.tendance-sensuelle.com/download/stocks_fr_2.csv",
      method: "GET",
      responseType: "stream",
    });

    // Créer un flux d'écriture pour sauvegarder le fichier
    const fileStream = fs.createWriteStream(downloadPath);

    // Relier le flux de données au fichier
    response.data.pipe(fileStream);

    // Gérer la fin du téléchargement
    fileStream.on("finish", async () => {
      const normalizeKey = (key) => {
        return key
          .trim() // Supprime les espaces inutiles
          .replace(/ /g, "_") // Remplace les espaces par des underscores
          .replace(/[^\w_]/g, "") // Supprime les caractères non alphanumériques ou non underscores
          .toLowerCase(); // Convertit en minuscule pour uniformiser
      };
      try {
        const cat = [
          "Lingerie",
          "Sexy Christmas",
          "Bas",
          "String, Culotte, Tanga & Shorty",
          "Bas jarretlles",
          "Babydoll",
          "Gants & Mitaines",
          "Guêpière, Corset & Serre-Taille",
          "Nuisette",
          "Bas autofixants",
          "Body",
          "Bodystocking",
          "Collants",
          "Ensemble de lingerie",
          "Soutien-Gorge",
          "Porte-jarretelles",
        ];
        const rows = [];
        fs.createReadStream(downloadPath)
          .pipe(iconv.decodeStream("ISO-8859-1")) // Décoder à partir de ISO-8859-1
          .pipe(iconv.encodeStream("utf-8")) // Réencoder en UTF-8
          .pipe(csvParser({ separator: ";" }))
          .on("data", (row) => {
            // Normaliser les clés de l'objet
            const normalizedRow = {};
            for (const [key, value] of Object.entries(row)) {
              normalizedRow[normalizeKey(key)] = value;
            }
            rows.push(normalizedRow);
          })
          .on("end", () => {
            const content = Array.from(rows)
              .filter((row) => cat.includes(row.nom_de_la_categorie_par_dfaut))
              .map((col) => ({
                id_produit: col.id_du_produit,
                name: col.nom,
                category: col.nom_de_la_categorie_par_dfaut,
                price: parseFloat(col.prix_de_vente_ht),
                stock: parseInt(col.quantite),
                imageUrl: col.url_de_limage_par_dfaut,
                description: col.description_sans_html,
                brand: col.fabriquant,
                color: col.couleur,
                size: col.tailles,
                reference: col.reference,
              }));
            // const images = rows.map((product) => {
            //   return {
            //     id: product.id_du_produit,
            //     imageUrl: product.urls_de_toutes_les_images.split(","),
            //   };
            // });
            const dir = path.dirname(productsPath);
            fs.mkdirSync(dir, { recursive: true });
            const jsonContent = JSON.stringify(content, null, 2);
            fs.writeFileSync(productsPath, jsonContent);
          });
      } catch (error) {
        console.error("Erreur :", error.message);
      }
      res.json({
        status: 200,
        message: "Fichier téléchargé avec succès",
        filePath: downloadPath,
      });
    });

    // Gérer les erreurs lors du téléchargement ou de l'écriture
    fileStream.on("error", (error) => {
      console.error("Erreur lors de la sauvegarde du fichier :", error);
      res.status(500).json({
        message: "Erreur lors de la sauvegarde du fichier",
        error: error.message,
      });
    });
  } catch (error) {
    console.error("Erreur lors du téléchargement :", error);
    res.status(500).json({
      message: "Erreur lors du téléchargement du fichier",
      error: error.message,
    });
  }
};

export const addProductsToDb = async (req, res) => {
  const productsPath = path.join(process.cwd(), "products", "stocks_fr_2.json");
  try {
    const fileContent = fs.readFileSync(productsPath);
    const products = JSON.parse(fileContent);

    const productsToAdd = await prisma.product.createMany({
      data: products,
      skipDuplicates: true,
    });

    res.status(201).json({
      message: "Produits ajoutés à la base de données avec succès",
      productsAdded: productsToAdd.count,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const allProducts = await prisma.product.findMany();

    const products = allProducts.reduce((acc, product) => {
      let existingGroup = acc.find((group) => group.name === product.name);

      if (!existingGroup) {
        existingGroup = {
          id: product.id,
          id_produit: product.id_produit,
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          imageUrl: product.imageUrl,
          brand: product.brand,
          description: product.description,
          items: [],
        };
        acc.push(existingGroup);
      }

      existingGroup.items.push({
        color: product.color,
        size: product.size,
        reference: product.reference,
      });

      return acc;
    }, []);

    res.status(200).json({
      message: "Produits récupérés avec succès",
      products: products,
      totalCount: products.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProductsPaginated = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;

    const pageNumber = parseInt(page, 10);
    const pageSizeNumber = parseInt(pageSize, 10);

    const skip = (pageNumber - 1) * pageSizeNumber;
    const take = pageSizeNumber;

    // Étape 2 : Récupérer les produits avec pagination
    const allProducts = await prisma.product.findMany({
      skip,
      take,
    });

    const products = allProducts.reduce((acc, product) => {
      let existingGroup = acc.find((group) => group.name === product.name);

      if (!existingGroup) {
        existingGroup = {
          id: product.id,
          id_produit: product.id_produit,
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          imageUrl: product.imageUrl,
          brand: product.brand,
          description: product.description,
          items: [],
        };
        acc.push(existingGroup);
      }

      existingGroup.items.push({
        color: product.color,
        size: product.size,
        reference: product.reference,
      });

      return acc;
    }, []);

    // Étape 3 : Compter le nombre total de produits
    const totalProducts = await prisma.product.count();

    // Calculer le nombre total de pages
    const totalPages = Math.ceil(totalProducts / pageSizeNumber);

    res.status(200).json({
      message: "Produits récupérés avec succès",
      data: products,
      currentPage: pageNumber,
      pageSize: pageSizeNumber,
      totalPages,
      totalProducts,
    });
  } catch (error) {
    console.error("Erreur :", error.message);
    res.status(500).json({
      message: "Erreur lors de la récupération des produits",
      error: error.message,
    });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.product.findMany({
      distinct: ["category"],
      select: {
        category: true,
      },
    });
    res
      .status(200)
      .json({ message: "Catégories récupérées avec succès", data: categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const allProducts = await prisma.product.findMany({
      where: { id_produit: id },
    });

    const products = allProducts.reduce((acc, product) => {
      let existingGroup = acc.find((group) => group.name === product.name);

      if (!existingGroup) {
        existingGroup = {
          id: product.id,
          id_produit: product.id_produit,
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          imageUrl: product.imageUrl,
          brand: product.brand,
          description: product.description,
          items: [],
        };
        acc.push(existingGroup);
      }

      existingGroup.items.push({
        color: product.color,
        size: product.size,
        reference: product.reference,
      });

      return acc;
    }, []);

    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProductByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const { page = 1, pageSize = 10 } = req.body;

    const pageNumber = parseInt(page, 10);
    const pageSizeNumber = parseInt(pageSize, 10);
    const skip = (pageNumber - 1) * pageSizeNumber;
    const take = pageSizeNumber;

    const allProducts = await prisma.product.findMany(
      { where: { category } },
      skip,
      take
    );

    const products = allProducts.reduce((acc, product) => {
      let existingGroup = acc.find((group) => group.name === product.name);

      if (!existingGroup) {
        existingGroup = {
          id: product.id,
          id_produit: product.id_produit,
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          imageUrl: product.imageUrl,
          brand: product.brand,
          description: product.description,
          items: [],
        };
        acc.push(existingGroup);
      }

      existingGroup.items.push({
        color: product.color,
        size: product.size,
        reference: product.reference,
      });

      return acc;
    }, []);

    const totalProducts = await prisma.product.count({ where: { category } });

    const totalPages = Math.ceil(totalProducts / pageSizeNumber);

    res.status(200).json({
      message: "Produits récupérés avec succès",
      data: products,
      currentPage: pageNumber,
      pageSize: pageSizeNumber,
      totalPages,
      totalProducts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
