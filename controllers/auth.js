
import express from 'express';
import jwt from 'jsonwebtoken'; 
import bcrypt from 'bcrypt'; 
import User from '../models/user_model.js';
import { formatValidationError } from '../utils/exception.js'
import dotenv from 'dotenv';
import Models from '../models/response/ResponseModel.js';
import logger from '../utils/logger.js';
import LoginResponse from '../models/response/LoginResponse.js';
import LogLogin from '../models/log_login.js';
import Joi from 'joi';
import permission_role from '../models/permission_model.js'
import { Op } from 'sequelize';
dotenv.config();


//docs: https://github.com/jquense/yup

//Need to fcm_token, because we want to notice to all user registed
// device_id: unique id of device, use to session login manager
const loginRequest = Joi.object({
    email: Joi.string().email().required().messages({
        "any.required": "Tên người dùng là bắt buộc",
        "string.base": "Tên người dùng phải là chuỗi ký tự"
    }),
    password: Joi.string().required().messages({
        "any.required": "Mật khẩu là bắt buộc",
        "string.base": "Mật khẩu phải là chuỗi ký tự"
    }),
    fcm_token: Joi.string().required().messages({
        "any.required": "FCM_Token là bắt buộc",
        "string.base": "FCM_Token phải là chuỗi ký tự"
    }),
    device_id: Joi.string().required().messages({
        "any.required": "device_id là bắt buộc",
        "string.base": "device_id phải là chuỗi ký tự"
    })
});


const registerRequest = Joi.object({
    email: Joi.string().email().required().messages({
        "any.required": "Tên người dùng là bắt buộc",
        "string.base": "Tên người dùng phải là chuỗi ký tự"
    }),
    password: Joi.string().required().messages({
        "any.required": "Mật khẩu là bắt buộc",
        "string.base": "Mật khẩu phải là chuỗi ký tự"
    }),
    full_name: Joi.string().required().messages({
        "any.required": "Mật khẩu là bắt buộc",
        "string.base": "Mật khẩu phải là chuỗi ký tự"
    }),


});

const login_google_request = Joi.object({
    email: Joi.string().email().required().messages({
        "any.required": "Email là bắt buộc",
        "string.base": "Email phải là chuỗi ký tự"
    }),
    password: Joi.string().allow('').optional(),
    full_name: Joi.string().optional(),
    fcm_token: Joi.string().allow('').optional(),
    device_id: Joi.string().allow('').optional(),
    first_name: Joi.string().optional(),
    last_name: Joi.string().optional(),
    avatar: Joi.string().optional(),
    number_phone: Joi.string().optional()

});

const login = async(req,res) => {
    const { error } = await loginRequest.validate(req.body);
    if (error) {
        const formattedErrors = formatValidationError(error.details);
        return res.json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Validation Error", formattedErrors), null));
    }
    try {
        const { email, password, device_id, fcm_token } = req.body;
        // Tìm người dùng dựa trên user_name
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Người dùng không tồn tại", null), null));
        }

        
        // So sánh mật khẩu đã nhập với chuỗi hash lấy từ cơ sở dữ liệu (for logging only)
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (true) { 

           await LogLogin.create({
                device_id: device_id,
                fcm_token: fcm_token,
                time_login: new Date(),
                user_id: user.id
            });

            //Get roles
            const roles = await user.getRoles();
            const roleNames = roles.map(role => role.name);
            const token = jwt.sign({ email: user.email, roles: roleNames }, process.env.TOKEN_SECRET, { expiresIn: '5d' });
            const userWithRoles = {
                ...user.toJSON(),
                roles: roleNames
            };

            var response = new LoginResponse(userWithRoles, token)
            return res.status(200).json(new Models.ResponseModel(true, null, response));

        } else {
            return res.json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Tên người dùng hoặc mật khẩu không chính xác", null), null));

        }

    } catch (err) {
        return res.json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", err.message), null));

    }
};


const loginAdmin = async (req, res, next) => {
    const { error } = await loginRequest.validate(req.body);
    if (error) {
        const formattedErrors = formatValidationError(error.details);
        return res.json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Validation Error", formattedErrors), null));
    }
    try {
        const { email, password, device_id, fcm_token } = req.body;
        // Tìm người dùng dựa trên user_name
        const user = await User.findOne({ where: { email } });


        if (!user) {
            return res.json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Người dùng không tồn tại", null), null));
        }
        // So sánh mật khẩu đã nhập với chuỗi hash lấy từ cơ sở dữ liệu
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {

            LogLogin.create({
                device_id: device_id,
                fcm_token: fcm_token,
                time_login: new Date(),
                user_id: user.id
            });

            //Get roles
            const roles = await user.getRoles();
            const roleNames = roles.map(role => role.name);

            if (!roleNames.includes("admin")) {
                return res.status(403).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Người dùng không có quyền admin", null), null));
            }

            const token = jwt.sign({ email: user.email, roles: roleNames }, process.env.TOKEN_SECRET, { expiresIn: '5d' });
            const userWithRoles = {
                ...user.toJSON(),
                roles: roleNames
            };

            var response = new LoginResponse(userWithRoles, token)
            return res.status(200).json(new Models.ResponseModel(true, null, response));

        } else {
            return res.json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Tên người dùng hoặc mật khẩu không chính xác", null), null));

        }

    } catch (err) {
        return res.json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", err.message), null));

    }
};

const register  = async (req, res, next) => {
    const { error } = await registerRequest.validate(req.body);
    if (error) {
        const formattedErrors = formatValidationError(error.details);
        return res.status(400).json({
            code: 400,
            message: "Validation Error",
            details: formattedErrors
        });
    }
    try {
        const { email, password, full_name } = req.body;

        var find_user = await User.findOne({ where: { email } });
        if (find_user) {
            return res.status(400).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Người dùng đã tồn tại", null), null));
        }

        const hashedPassword = await hashPassword(password);

        const newUser = await User.create({
            email: email,
            password: hashedPassword,
            full_name: full_name,
        });

        let userRole = await permission_role.Role.findOne({ where: { name: 'user' } });
        if (!userRole) {
            userRole = await permission_role.Role.create({ name: 'user', display_name: 'Customer' });
        }
        await newUser.addRole(userRole);

        return res.status(201).json(new Models.ResponseModel(true, null, newUser));

    } catch (err) {
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", err.message), null));
    }

};

const findUser = async (req, res, next) => {
    const email = req.query.email;
    const user = await User.findOne({ where: { email } });

    if (!user) {
        return res.json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Người dùng không tồn tại", null), null));
    }
    return res.status(200).json(new Models.ResponseModel(true, null, user));

};

// Tìm kiếm users theo email (dùng cho voucher)
const searchUsers = async (req, res, next) => {
    try {
        const { search, limit = 10 } = req.query;
        logger.info(`searchUsers called with search: ${search}`);

        if (!search || search.length < 2) {
            return res.status(200).json(new Models.ResponseModel(true, null, []));
        }

        const users = await User.findAll({
            where: {
                email: { [Op.like]: `%${search}%` }
            },
            attributes: ['id', 'email', 'full_name'],
            limit: parseInt(limit)
        });
        return res.status(200).json(new Models.ResponseModel(true, null, users));
    } catch (err) {
        logger.error(`searchUsers error: ${err.message}`);
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", err.message), null));
    }
};




// Hàm băm mật khẩu
async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(password, salt);

        return hash;
    } catch (err) {
        console.error('Error hashing password:', err);
        throw err; // Rethrow the error to handle it outside
    }
}


const loginGoogle = async (req, res, next) => {
    logger.info("Login with google");
    const { error } = await login_google_request.validate(req.body);
    if (error) {
        const formattedErrors = formatValidationError(error.details);
        return res.status(400).json({
            code: 400,
            message: "Validation Error",
            details: formattedErrors
        });
    }
    try {
        const { email, password, full_name, first_name, last_name, number_phone, avatar, fcm_token, device_id } = req.body;

        const hashedPassword = await hashPassword(password);

        // Check if user already exists
        let user = await User.findOne({ where: { email } });
        
        if (user) {
            // User exists, don't update password, just update other fields if needed
            await user.update({
                first_name: first_name || user.first_name,
                last_name: last_name || user.last_name,
                full_name: full_name || user.full_name,
                number_phone: number_phone || user.number_phone,
                avatar: avatar || user.avatar
            });
        } else {
            // User doesn't exist, create new user with hashed password
            user = await User.create({
                first_name: first_name,
                last_name: last_name,
                email: email,
                password: hashedPassword,
                full_name: full_name,
                number_phone: number_phone,
                avatar: avatar
            });
        }
        
        let userRole = await permission_role.Role.findOne({ where: { name: 'user' } });
        if (!userRole) {
            userRole = await permission_role.Role.create({ name: 'user', display_name: 'Customer' });
        }
        
        // Only add role if user doesn't already have it
        const existingRoles = await user.getRoles();
        const hasUserRole = existingRoles.some(role => role.name === 'user');
        
        if (!hasUserRole) {
            await user.addRole(userRole);
        }
        
        LogLogin.create({
            device_id: device_id,
            fcm_token: fcm_token,
            time_login: new Date(),
            user_id: user.id
        });

        // Get roles and generate token
        const roles = await user.getRoles();
        const roleNames = roles.map(role => role.name);
        const token = jwt.sign({ email: user.email, roles: roleNames }, process.env.TOKEN_SECRET, { expiresIn: '5d' });
        
        const userWithRoles = {
            ...user.toJSON(),
            roles: roleNames
        };

        var response = new LoginResponse(userWithRoles, token);
        return res.status(200).json(new Models.ResponseModel(true, null, response));

    } catch (err) {
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", err.message), null));
    }
};

const updateProfile = async (req, res) => {
    try {
        const user = req.user;
        const { full_name, number_phone } = req.body;

        await user.update({
            full_name: full_name || user.full_name,
            number_phone: number_phone || user.number_phone
        });

        return res.status(200).json(new Models.ResponseModel(true, null, user));
    } catch (err) {
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", err.message), null));
    }
};

const changePassword = async (req, res) => {
    try {
        const user = req.user;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Vui lòng nhập đầy đủ thông tin", null), null));
        }

        if (new_password.length < 6) {
            return res.status(400).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Mật khẩu mới phải có ít nhất 6 ký tự", null), null));
        }

        const passwordMatch = await bcrypt.compare(current_password, user.password);
        if (!passwordMatch) {
            return res.status(400).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Mật khẩu hiện tại không đúng", null), null));
        }

        const hashedPassword = await hashPassword(new_password);
        await user.update({ password: hashedPassword });

        return res.status(200).json(new Models.ResponseModel(true, null, { message: "Đổi mật khẩu thành công" }));
    } catch (err) {
        return res.status(500).json(new Models.ResponseModel(false, new Models.ErrorResponseModel(1, "Lỗi hệ thống", err.message), null));
    }
};

export default {login,loginAdmin,register,findUser,searchUsers,loginGoogle,updateProfile,changePassword}