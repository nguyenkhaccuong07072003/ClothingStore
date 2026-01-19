import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('admin_user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)

  async function login(email, password) {
    try {
      const response = await api.post('/auth/admin/login', {
        email,
        password,
        device_id: 'admin-web',
        fcm_token: 'admin-web'
      })

      if (response.data.success) {
        token.value = response.data.data.token
        user.value = response.data.data.user

        localStorage.setItem('admin_token', token.value)
        localStorage.setItem('admin_user', JSON.stringify(user.value))

        return { success: true }
      } else {
        return { success: false, message: response.data.message }
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Đăng nhập thất bại'
      }
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout
  }
})
