import express from "express";
import Joi from "joi";
const router = express.Router(); // Sử dụng express.Router()
import { formatValidationError } from "../utils/exception.js";
import logger from "../utils/logger.js";
import Image from "../models/image_model.js";
import Models from "../models/response/ResponseModel.js";
import upload from "../config/upload.js";
import { authenticateToken, authorizeRole } from "../config/jwt_filter.js";

const getImageByModel = Joi.object({
    model_name: Joi.string().required().messages({
        "any.required": "model_name là bắt buộc",
        "string.base": "model_name phải là chuỗi ký tự",
    }),
    model_id: Joi.string().required().messages({
        "any.required": "model_id là bắt buộc",
        "string.base": "model_id phải là chuỗi kí tự",
    }),
});

//Get image
router.get('/images', async (req,res,next)=>{
    const { error } = getImageByModel.validate(req.query);
    if (error) {
        const formattedErrors = formatValidationError(error.details);
        return res.status(400).json(new Models.ResponseModel(false,new Models.ErrorResponseModel(1,"Validation Error",formattedErrors ),null));
        }
        try {
            const { model_name, model_id } = req.query;
            const images = await Image.findAll({
                where: {
                    model_name: model_name,
                    model_id: model_id
                }
            });
    
            if (images.length > 0) {
                return res.status(200).json(new Models.ResponseModel(true, null, images));
            } else {
                return res.status(404).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "No images found"), null));
            }
           
        } catch (err) {
            logger.error("Error fetching images:", err);
            return res.status(500).json(new Models.ResponseModel(false,new Models.ErrorResponseModel(1, "Lỗi hệ thống", err.message), null));
        }
});

// Upload single image
router.post('/upload/image', authenticateToken, authorizeRole(["admin"]), upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Không có file được upload"), null));
        }

        // Construct the URL for the uploaded image
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

        return res.status(200).json(new Models.ResponseModel(true, null, {
            url: imageUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size
        }));
    } catch (err) {
        logger.error("Error uploading image:", err);
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi upload ảnh", err.message), null));
    }
});

// Upload multiple images
router.post('/upload/images', authenticateToken, authorizeRole(["admin"]), upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Không có file được upload"), null));
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const uploadedImages = req.files.map(file => ({
            url: `${baseUrl}/uploads/${file.filename}`,
            filename: file.filename,
            originalname: file.originalname,
            size: file.size
        }));

        return res.status(200).json(new Models.ResponseModel(true, null, uploadedImages));
    } catch (err) {
        logger.error("Error uploading images:", err);
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi upload ảnh", err.message), null));
    }
});

export default router;