<template>
  <div class="profile-page">
    <div class="page-header">
      <h2>Thông tin tài khoản</h2>
    </div>

    <el-row :gutter="20">
      <!-- Profile Info -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>Thông tin cá nhân</span>
          </template>

          <el-form
            ref="profileFormRef"
            :model="profileForm"
            :rules="profileRules"
            label-width="120px"
          >
            <el-form-item label="Email">
              <el-input v-model="profileForm.email" disabled />
            </el-form-item>

            <el-form-item label="Họ và tên" prop="full_name">
              <el-input v-model="profileForm.full_name" placeholder="Nhập họ và tên" />
            </el-form-item>

            <el-form-item label="Số điện thoại" prop="number_phone">
              <el-input v-model="profileForm.number_phone" placeholder="Nhập số điện thoại" />
            </el-form-item>

            <el-form-item label="Ngày tạo">
              <el-input :value="formatDate(profileForm.created_at)" disabled />
            </el-form-item>

            <el-form-item label="Quyền">
              <div class="roles-tags">
                <el-tag v-for="role in profileForm.roles" :key="role" type="primary">
                  {{ getRoleLabel(role) }}
                </el-tag>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="savingProfile" @click="handleUpdateProfile">
                Cập nhật thông tin
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- Change Password -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>Đổi mật khẩu</span>
          </template>

          <el-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="140px"
          >
            <el-form-item label="Mật khẩu hiện tại" prop="current_password">
              <el-input
                v-model="passwordForm.current_password"
                type="password"
                show-password
                placeholder="Nhập mật khẩu hiện tại"
              />
            </el-form-item>

            <el-form-item label="Mật khẩu mới" prop="new_password">
              <el-input
                v-model="passwordForm.new_password"
                type="password"
                show-password
                placeholder="Nhập mật khẩu mới"
              />
            </el-form-item>

            <el-form-item label="Xác nhận mật khẩu" prop="confirm_password">
              <el-input
                v-model="passwordForm.confirm_password"
                type="password"
                show-password
                placeholder="Nhập lại mật khẩu mới"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="savingPassword" @click="handleChangePassword">
                Đổi mật khẩu
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()

const profileFormRef = ref(null)
const passwordFormRef = ref(null)
const savingProfile = ref(false)
const savingPassword = ref(false)

const profileForm = reactive({
  email: '',
  full_name: '',
  number_phone: '',
  created_at: '',
  roles: []
})

const passwordForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

const profileRules = {
  full_name: [
    { required: true, message: 'Vui lòng nhập họ và tên', trigger: 'blur' }
  ]
}

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.new_password) {
    callback(new Error('Mật khẩu xác nhận không khớp'))
  } else {
    callback()
  }
}

const passwordRules = {
  current_password: [
    { required: true, message: 'Vui lòng nhập mật khẩu hiện tại', trigger: 'blur' }
  ],
  new_password: [
    { required: true, message: 'Vui lòng nhập mật khẩu mới', trigger: 'blur' },
    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự', trigger: 'blur' }
  ],
  confirm_password: [
    { required: true, message: 'Vui lòng xác nhận mật khẩu', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

function loadProfile() {
  const user = authStore.user
  if (user) {
    profileForm.email = user.email || ''
    profileForm.full_name = user.full_name || ''
    profileForm.number_phone = user.number_phone || ''
    profileForm.created_at = user.createdAt || user.created_at || ''
    profileForm.roles = user.roles || []
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getRoleLabel(role) {
  const labels = {
    'admin': 'Quản trị viên',
    'user': 'Người dùng'
  }
  return labels[role] || role
}

async function handleUpdateProfile() {
  if (!profileFormRef.value) return

  await profileFormRef.value.validate(async (valid) => {
    if (!valid) return

    savingProfile.value = true
    try {
      const response = await api.put('/auth/profile', {
        full_name: profileForm.full_name,
        number_phone: profileForm.number_phone
      })

      if (response.data.success) {
        // Cập nhật store
        authStore.user = {
          ...authStore.user,
          full_name: profileForm.full_name,
          number_phone: profileForm.number_phone
        }
        ElMessage.success('Cập nhật thông tin thành công')
      } else {
        ElMessage.error(response.data.error?.message || 'Có lỗi xảy ra')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.error?.message || 'Có lỗi xảy ra')
    } finally {
      savingProfile.value = false
    }
  })
}

async function handleChangePassword() {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return

    savingPassword.value = true
    try {
      const response = await api.put('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      })

      if (response.data.success) {
        ElMessage.success('Đổi mật khẩu thành công')
        // Reset form
        passwordForm.current_password = ''
        passwordForm.new_password = ''
        passwordForm.confirm_password = ''
        passwordFormRef.value.resetFields()
      } else {
        ElMessage.error(response.data.error?.message || 'Có lỗi xảy ra')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.error?.message || 'Mật khẩu hiện tại không đúng')
    } finally {
      savingPassword.value = false
    }
  })
}

onMounted(() => {
  loadProfile()
})
</script>

<style lang="scss" scoped>
.profile-page {
  max-width: 1000px;

  .page-header {
    margin-bottom: 20px;
  }

  .el-card {
    margin-bottom: 20px;
  }

  .roles-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}
</style>