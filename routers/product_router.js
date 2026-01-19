import express from "express";
import Joi from "joi";
const router = express.Router(); // Sử dụng express.Router()
import { formatValidationError } from "../utils/exception.js";
import Category from "../models/category_model.js";
import product_model from "../models/product_model.js";
import upload from "../config/upload.js";
import Models from "../models/response/ResponseModel.js";
import { authenticateToken, authorizeRole } from "../config/jwt_filter.js";
import logger from "../utils/logger.js";
import sequelize from '../connection/mysql.js';
import { Op } from "sequelize";

const addCategory = Joi.object({
    category_name: Joi.string().required().messages({
        "any.required": "Tên danh mục là bắt buộc",
        "string.base": "Tên danh mục phải là chuỗi ký tự",
    }),
    is_public: Joi.boolean().required().messages({
        "any.required": "is_public là bắt buộc",
        "string.base": "is_public phải là true hoặc false",
    }),
});

const updateCategory = Joi.object({
    name: Joi.string().optional().messages({
        "string.base": "Tên danh mục phải là chuỗi ký tự",
    }),
    is_public: Joi.boolean().optional().messages({
        "boolean.base": "is_public phải là true hoặc false",
    }),
});

// Joi schema cho sản phẩm
const productSchema = Joi.object({
    name: Joi.string().required().messages({
        "any.required": "Tên sản phẩm là bắt buộc",
        "string.base": "Tên sản phẩm phải là chuỗi ký tự",
    }),
    price: Joi.number().required().min(0).messages({
        "any.required": "Giá sản phẩm là bắt buộc",
        "number.base": "Giá phải là số",
        "number.min": "Giá phải lớn hơn hoặc bằng 0",
    }),
    description: Joi.string().optional().allow(""),
    is_public: Joi.boolean().optional(),
    img_preview: Joi.string().required().messages({
        "any.required": "Ảnh đại diện là bắt buộc",
    }),
    category_ids: Joi.array().items(Joi.number()).optional(),
    variants: Joi.array().items(
        Joi.object({
            id: Joi.number().optional(),
            color: Joi.string().required(),
            size: Joi.string().required(),
            price: Joi.number().required().min(0),
            quantity: Joi.number().required().min(0),
        })
    ).optional(),
    images: Joi.array().items(Joi.string()).optional(),
});

const updateProductSchema = Joi.object({
    name: Joi.string().optional(),
    price: Joi.number().optional().min(0),
    description: Joi.string().optional().allow(""),
    is_public: Joi.boolean().optional(),
    img_preview: Joi.string().optional(),
    category_ids: Joi.array().items(Joi.number()).optional(),
    variants: Joi.array().items(
        Joi.object({
            id: Joi.number().optional(),
            color: Joi.string().required(),
            size: Joi.string().required(),
            price: Joi.number().required().min(0),
            quantity: Joi.number().required().min(0),
        })
    ).optional(),
    images: Joi.array().items(Joi.string()).optional(),
});

//search product by like name
router.get("/products/search/", authenticateToken, authorizeRole(["admin", "user"]), async (req,res,next)=>{
    try {
        const searchQuery = req.query.name;

        const query = `SELECT * FROM products WHERE LOWER(name) LIKE LOWER(?)`;
        const replacements = [`%${searchQuery}%`];
        const products = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT,
        });

        return res.status(200).json(new Models.ResponseModel(true, null, products));
    } catch (error) {
        next(error); // Gọi next để truyền lỗi cho middleware xử lý lỗi
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", error.message), null));
    }
});

//get all products with pagination and filters (admin)
router.get("/products", async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || "";
        const categoryId = req.query.category_id;
        const isPublic = req.query.is_public;

        // Build where clause
        const whereClause = {};

        if (search) {
            whereClause.name = { [Op.like]: `%${search}%` };
        }

        if (isPublic !== undefined && isPublic !== "") {
            whereClause.is_public = isPublic === "true";
        }

        // Build include for category filter
        const includeOptions = [{
            model: Category,
            through: { attributes: [] },
            ...(categoryId ? { where: { id: categoryId } } : {})
        }];

        const { count, rows: products } = await product_model.Product.findAndCountAll({
            where: whereClause,
            include: includeOptions,
            order: [["createdAt", "DESC"]],
            limit,
            offset,
            distinct: true
        });

        return res.status(200).json(new Models.ResponseModel(true, null, {
            products,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        }));
    } catch (error) {
        logger.error("Error fetching products:", error);
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", error.message), null));
    }
});



//Find product details
router.get('/products/:id', async (req,res,next)=>{
    try {
        const id = req.params.id;
        const product = await product_model.Product.findByPk(id, {
            include: [
                {
                    model: product_model.ProductDetails,
                    as: 'product_details'
                },
                {
                    model: Category,
                    through: { attributes: [] }
                }
            ]
        });

        if (!product) {
            return res.status(404).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(2, "Product not found", null), null));
        }

        return res.status(200).json(new Models.ResponseModel(true, null, product));
    } catch (error) {
        logger.error("Error fetching products details:", error);
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", error.message), null));
    }
});

//Pagination
router.get("/p", async (req, res, next) => {
    const limit = req.body.limit;
    const offset = req.body.offset;

    const products = await User.findAll({
        limit: limit,
        offset: offset,
    });
});

//Create new product
router.post("/products", authenticateToken, authorizeRole(["admin"]), async (req, res, next) => {
    const { error } = productSchema.validate(req.body);
    if (error) {
        const formattedErrors = formatValidationError(error.details);
        return res.status(400).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Validation Error", formattedErrors), null));
    }

    const transaction = await sequelize.transaction();

    try {
        const { name, price, description, is_public, img_preview, category_ids, variants, images } = req.body;

        // Create product
        const product = await product_model.Product.create({
            name,
            price,
            description: description || "",
            is_public: is_public !== undefined ? is_public : true,
            img_preview
        }, { transaction });

        // Add categories
        if (category_ids && category_ids.length > 0) {
            const categories = await Category.findAll({
                where: { id: category_ids }
            });
            await product.setCategories(categories, { transaction });
        }

        // Add variants (product details)
        if (variants && variants.length > 0) {
            const variantData = variants.map(v => ({
                color: v.color,
                size: v.size,
                price: v.price,
                quantity: v.quantity,
                product_id: product.id
            }));
            await product_model.ProductDetails.bulkCreate(variantData, { transaction });
        }

        await transaction.commit();

        // Fetch full product with relations
        const fullProduct = await product_model.Product.findByPk(product.id, {
            include: [
                { model: product_model.ProductDetails, as: 'product_details' },
                { model: Category, through: { attributes: [] } }
            ]
        });

        return res.status(201).json(new Models.ResponseModel(true, null, fullProduct));
    } catch (error) {
        await transaction.rollback();
        logger.error("Error creating product:", error);
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", error.message), null));
    }
});

//Update product
router.put("/products/:id", authenticateToken, authorizeRole(["admin"]), async (req, res, next) => {
    const { error } = updateProductSchema.validate(req.body);
    if (error) {
        const formattedErrors = formatValidationError(error.details);
        return res.status(400).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Validation Error", formattedErrors), null));
    }

    const transaction = await sequelize.transaction();

    try {
        const productId = req.params.id;
        const { name, price, description, is_public, img_preview, category_ids, variants } = req.body;

        // Check if product exists
        const product = await product_model.Product.findByPk(productId);
        if (!product) {
            await transaction.rollback();
            return res.status(404).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(2, "Sản phẩm không tồn tại", null), null));
        }

        // Update product fields
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = price;
        if (description !== undefined) updateData.description = description;
        if (is_public !== undefined) updateData.is_public = is_public;
        if (img_preview !== undefined) updateData.img_preview = img_preview;

        await product.update(updateData, { transaction });

        // Update categories
        if (category_ids !== undefined) {
            const categories = await Category.findAll({
                where: { id: category_ids }
            });
            await product.setCategories(categories, { transaction });
        }

        // Update variants
        if (variants !== undefined) {
            // Delete old variants
            await product_model.ProductDetails.destroy({
                where: { product_id: productId },
                transaction
            });

            // Create new variants
            if (variants.length > 0) {
                const variantData = variants.map(v => ({
                    color: v.color,
                    size: v.size,
                    price: v.price,
                    quantity: v.quantity,
                    product_id: productId
                }));
                await product_model.ProductDetails.bulkCreate(variantData, { transaction });
            }
        }

        await transaction.commit();

        // Fetch updated product
        const updatedProduct = await product_model.Product.findByPk(productId, {
            include: [
                { model: product_model.ProductDetails, as: 'product_details' },
                { model: Category, through: { attributes: [] } }
            ]
        });

        return res.status(200).json(new Models.ResponseModel(true, null, updatedProduct));
    } catch (error) {
        await transaction.rollback();
        logger.error("Error updating product:", error);
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", error.message), null));
    }
});

//Delete product
router.delete("/products/:id", authenticateToken, authorizeRole(["admin"]), async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const productId = req.params.id;

        // Check if product exists
        const product = await product_model.Product.findByPk(productId);
        if (!product) {
            await transaction.rollback();
            return res.status(404).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(2, "Sản phẩm không tồn tại", null), null));
        }

        // Delete product details first
        await product_model.ProductDetails.destroy({
            where: { product_id: productId },
            transaction
        });

        // Remove category associations
        await product.setCategories([], { transaction });

        // Delete product
        await product.destroy({ transaction });

        await transaction.commit();

        return res.status(200).json(new Models.ResponseModel(true, null, "Xóa sản phẩm thành công"));
    } catch (error) {
        await transaction.rollback();
        logger.error("Error deleting product:", error);
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", error.message), null));
    }
});

// Lấy sản phẩm liên quan (cùng category, không bao gồm sản phẩm hiện tại)
router.get("/products/:id/related", async (req, res, next) => {
    try {
        const productId = req.params.id;
        const limit = parseInt(req.query.limit) || 10;

        // Tìm sản phẩm hiện tại và lấy categories của nó
        const currentProduct = await product_model.Product.findByPk(productId, {
            include: [{
                model: Category,
                through: { attributes: [] }
            }]
        });

        if (!currentProduct) {
            return res.status(404).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(2, "Sản phẩm không tồn tại", null), null));
        }

        // Lấy danh sách category IDs của sản phẩm hiện tại
        const categories = currentProduct.Categories || [];
        const categoryIds = categories.map(cat => cat.id);

        let relatedProducts = [];

        // Nếu có category, lấy sản phẩm cùng category trước
        if (categoryIds.length > 0) {
            relatedProducts = await product_model.Product.findAll({
                where: {
                    id: { [Op.ne]: productId },
                    is_public: true
                },
                include: [{
                    model: Category,
                    through: { attributes: [] },
                    where: { id: { [Op.in]: categoryIds } }
                }],
                order: [["createdAt", "DESC"]],
                limit
            });
        }

        // Nếu chưa đủ số lượng, bổ sung sản phẩm random
        if (relatedProducts.length < limit) {
            const existingIds = relatedProducts.map(p => p.id);
            existingIds.push(productId); // Loại bỏ sản phẩm hiện tại

            const randomProducts = await product_model.Product.findAll({
                where: {
                    id: { [Op.notIn]: existingIds },
                    is_public: true
                },
                order: sequelize.random(),
                limit: limit - relatedProducts.length
            });

            relatedProducts = [...relatedProducts, ...randomProducts];
        }

        return res.status(200).json(new Models.ResponseModel(true, null, relatedProducts));
    } catch (error) {
        logger.error("Error fetching related products:", error);
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", error.message), null));
    }
});

//------------------------ CATEGORY -----------------------------------------------------------------

router.delete("/categories/:id",authenticateToken,authorizeRole(["admin"]), async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Kiểm tra danh mục có tồn tại hay không
        const existingCategory = await Category.findByPk(categoryId);
        if (!existingCategory) {
            return res.status(404).json(new Models.ResponseModel( false,new Models.ErrorResponseModel(1, "Danh mục không tồn tại", null),null));
        }

        // Xóa danh mục
        await Category.destroy({ where: { id: categoryId } });

        return res.status(200).json(new Models.ResponseModel(true, null,"Danh mục đã được xóa thành công"));
    } catch (err) {
        return res.status(500).json(new Models.ResponseModel(false,new Models.ErrorResponseModel(1, "Lỗi hệ thống", err.message),null));
    }
}
);

//get all category
router.get("/categories/", async (req,res,next)=>{

    try{
        const categories = await Category.findAll();
        return res.status(200).json(new Models.ResponseModel(true, null, categories));
    } catch (error) {
        logger.error("Error fetching categories:", error);
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", error.message), null));
    }
});

router.get("/categories/:id/products", async (req, res, next) => {
    try {
        const categoryId = req.params.id;
        const limit = parseInt(req.query.limit) || 20; 
        const offset = parseInt(req.query.offset) || 0; 

        const category = await Category.findByPk(categoryId);
        if (!category) {
            return res.json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Category not found", null), null));
        }

        // Lấy danh sách sản phẩm thuộc về danh mục này với phân trang
        const products = await product_model.Product.findAll({
            include: {
                model: Category,
                through: { attributes: [] }, // Loại bỏ các thuộc tính của bảng trung gian
                where: { id: categoryId },
            },
            limit: limit,
            offset: offset,
        });

        return res.json(new Models.ResponseModel(true, null, products));
    } catch (error) {
        logger.error("Error fetching products:", error);
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", error.message), null));
    }
});

router.post("/category",authenticateToken, authorizeRole(["admin"]), async (req, res, next) => {
    const { error } = addCategory.validate(req.body);
    if (error) {
        const formattedErrors = formatValidationError(error.details);
        return res.status(400).json(new Models.ResponseModel(false,new Models.ErrorResponseModel(1,"Validation Error",formattedErrors ),null));
        }
        try {
            const existingCategory = await Category.findOne({
                where: {
                    name: req.body.category_name,
                },
            });
            if (existingCategory) {
                return res.status(409).json(new Models.ResponseModel(false,new Models.ErrorResponseModel(1, "Danh mục đã tồn tại", null),null));
            } else {
                if (!req.body.category_name || req.body.category_name.trim() === "") {
                    return res.status(400).json(new Models.ResponseModel(false,new Models.ErrorResponseModel(1,"Tên danh mục không hợp lệ",null),null));
                } else {
                    const newCategory = new Category({
                        name: req.body.category_name,
                        is_public:
                            req.body.is_public === "true" || req.body.is_public === true,
                    });
                    const savedCategory = await newCategory.save();
                    return res.status(201).json(new Models.ResponseModel( true, null,savedCategory));
                }
            }
        } catch (err) {
            return res.status(500).json(new Models.ResponseModel(false,new Models.ErrorResponseModel(1, "Lỗi hệ thống", err.message), null));
        }
    }
);

router.put("/category/:id", authenticateToken, authorizeRole(["admin"]),async (req, res) => {
        // Xác thực dữ liệu đầu vào
        const { error } = updateCategory.validate(req.body);
        if (error) {
            const formattedErrors = formatValidationError(error.details);
            return res.status(400).json(new Models.ResponseModel(false,new Models.ErrorResponseModel(1,"Validation Error",formattedErrors),null));
        }

        try {
            const categoryId = req.params.id;
            const category_name = req.body.name;

            // Kiểm tra danh mục có tồn tại hay không
            const existingCategory = await Category.findOne({
                where: { id: categoryId },
            });
            if (!existingCategory) {
                return res.status(404).json(new Models.ResponseModel(false,new Models.ErrorResponseModel(1, "Danh mục không tồn tại", null),null));
            }

            // Lấy tất cả danh mục và kiểm tra trùng lặp
            const categories = await Category.findAll();
            const isDuplicate = categories.some(
                (category) =>
                    category.name === category_name && String(category.id) !== String(categoryId)
            );

            if (isDuplicate) {
                return res.status(409).json(new Models.ResponseModel( false,new Models.ErrorResponseModel(1, "Danh mục đã tồn tại", null),null));
            }

            // Cập nhật danh mục
            await Category.update(req.body, {
                where: { id: categoryId },
            });

            // Lấy lại danh mục đã cập nhật
            const updatedCategory = await Category.findByPk(categoryId);

            // Trả về bản ghi đã cập nhật
            return res.status(200).json(new Models.ResponseModel(true, null, updatedCategory));
        } catch (err) {
            return res.status(500).json(new Models.ResponseModel(false,new Models.ErrorResponseModel(1, "Lỗi hệ thống", err.message),null));
        }
    }
);


export default router;
