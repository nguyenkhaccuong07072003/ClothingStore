import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config(); // Nạp các biến môi trường từ file .env

const isDev = process.env.NODE_ENV !== 'production';

// Khởi tạo kết nối Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  port: process.env.DB_PORT || 3306,
  logging: false, // Tắt log SQL - chỉ bật khi debug
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Sử dụng export default
export default sequelize;
