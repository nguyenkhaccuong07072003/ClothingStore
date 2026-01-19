import express from "express";
import { authenticateToken, authorizeRole } from "../config/jwt_filter.js";
import permission_role from '../models/permission_model.js'
import authController from '../controllers/auth.js'
import logger from "../utils/logger.js";
const router = express.Router(); // Sử dụng express.Router()

//log_login : id, user_id, device_id, fcm_token, time_login
// use post to hash data in request
// Step 1: hash password and compare to password in database
// Step 2: IF password incorrect return message,else transfer step 3
// Step 3: Check user is_active => callback if is not active
// Step 4: Get token (jsonwebtoken) 
// Step 5: we need to add infor login on database
// Step 6: return reponse with info user and token

router.post('/login', authController.login);

//Login with admin
router.post('/admin/login', authController.loginAdmin);

//Step 1: you must validate data from request 
//If information missing , you need to response with error
//Step 2: Check user exist
router.post('/register', authController.register);


router.post('/login_google', authController.loginGoogle);

router.get("/find_user", authenticateToken, authorizeRole(["admin"]), authController.findUser);

// Tìm kiếm users theo email (dùng cho voucher)
router.get("/admin/users", authenticateToken, authorizeRole(["admin"]), authController.searchUsers);

// Profile APIs
router.put("/profile", authenticateToken, authController.updateProfile);
router.put("/change-password", authenticateToken, authController.changePassword);

export default router;




