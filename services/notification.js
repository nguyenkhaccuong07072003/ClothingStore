// notification_service.js
import admin from './firebase_admin.js';
import LogLogin from '../models/log_login.js';

// Hàm gửi thông báo
export const sendNotification = async (userId, notification) => {
  try {
    // Tìm người dùng trong cơ sở dữ liệu
    const logLogin = await LogLogin.findOne({
      where: { user_id: userId },
      order: [['time_login', 'DESC']], // Sắp xếp theo time_login giảm dần
  });

    if (!logLogin) {
      throw new Error(`Người dùng với ID ${userId} không tồn tại.`);
    }

    if (!logLogin.fcm_token) {
      throw new Error(`Người dùng với ID ${userId} không có deviceToken.`);
    }

    // Chuẩn bị thông báo
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        title: notification.title,
        body: notification.body,
        click_action: 'NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'CLOTHING_STORE_V4_SOUND',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      token: logLogin.fcm_token,
    };
    // Gửi thông báo Firebase
    const response = await admin.messaging().send(message);
    return response;

  } catch (error) {
    // Token hết hạn hoặc lỗi khác - bỏ qua không log
    return null;
  }
};
