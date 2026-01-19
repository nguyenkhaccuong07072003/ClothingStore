<template>
  <div class="vouchers-page">
    <div class="page-header">
      <h2>Quản lý Voucher</h2>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>
        Thêm voucher
      </el-button>
    </div>

    <!-- Filter -->
    <div class="filter-section">
      <el-radio-group v-model="statusFilter" @change="applyFilter">
        <el-radio-button value="all">Tất cả</el-radio-button>
        <el-radio-button value="active">Đang hoạt động</el-radio-button>
        <el-radio-button value="pending">Chưa bắt đầu</el-radio-button>
        <el-radio-button value="expired">Hết hạn</el-radio-button>
        <el-radio-button value="used_up">Đã hết lượt</el-radio-button>
      </el-radio-group>
    </div>

    <div class="data-table">
      <el-table :data="vouchers" v-loading="loading" stripe>
        <el-table-column prop="title" label="Tiêu đề" min-width="180" />

        <el-table-column label="Giảm giá" width="140">
          <template #default="{ row }">
            <span v-if="row.type === 'FREESHIP'">Miễn phí ship</span>
            <span v-else-if="row.type === 'DISCOUNTPERCENT'">{{ row.discount }}%</span>
            <span v-else>{{ formatPrice(row.discount) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Loại" width="140">
          <template #default="{ row }">
            <el-tag :type="getVoucherTypeColor(row.type)">
              {{ getVoucherTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Đã dùng" width="120">
          <template #default="{ row }">
            {{ row.used }} / {{ row.quantity }}
          </template>
        </el-table-column>

        <el-table-column label="Thời gian" min-width="200">
          <template #default="{ row }">
            <div>{{ formatDate(row.start_at) }}</div>
            <div class="text-muted">đến {{ formatDate(row.end_at) }}</div>
          </template>
        </el-table-column>

        <el-table-column label="Trạng thái" width="120">
          <template #default="{ row }">
            <el-tag :type="getVoucherStatusType(row)">
              {{ getVoucherStatus(row) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Áp dụng cho" min-width="180">
          <template #default="{ row }">
            <span v-if="!row.user_id">Tất cả</span>
            <span v-else>{{ row.user?.email || `User #${row.user_id}` }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="60" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDialog(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchVouchers"
          @current-change="fetchVouchers"
        />
      </div>
    </div>

    <!-- Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? 'Chỉnh sửa voucher' : 'Thêm voucher mới'"
      width="550px"
      class="voucher-dialog"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="Tiêu đề" prop="title">
          <el-input v-model="form.title" placeholder="VD: Giảm 10% đơn hàng" />
        </el-form-item>

        <el-form-item label="Mô tả" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="Mô tả voucher..." />
        </el-form-item>

        <el-form-item label="Loại giảm giá" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="FREESHIP">Miễn phí ship</el-radio>
            <el-radio value="DISCOUNTPERCENT">Giảm %</el-radio>
            <el-radio value="DISCOUNTMONEY">Giảm tiền</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.type !== 'FREESHIP'" label="Giá trị giảm" prop="discount">
          <el-input-number
            v-model="form.discount"
            :min="0"
            :max="form.type === 'DISCOUNTPERCENT' ? 100 : 10000000"
            :step="form.type === 'DISCOUNTPERCENT' ? 5 : 10000"
          />
          <span style="margin-left: 10px">{{ form.type === 'DISCOUNTPERCENT' ? '%' : 'VNĐ' }}</span>
        </el-form-item>

        <el-form-item label="Số lượng" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" />
        </el-form-item>

        <el-form-item label="Thời gian" prop="dateRange">
          <el-date-picker
            v-model="form.dateRange"
            type="datetimerange"
            range-separator="đến"
            start-placeholder="Bắt đầu"
            end-placeholder="Kết thúc"
            format="DD/MM/YYYY HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            :teleported="true"
          />
        </el-form-item>

        <el-form-item label="Công khai">
          <el-switch v-model="form.is_public" />
        </el-form-item>

        <el-form-item label="Áp dụng cho">
          <el-radio-group v-model="form.targetType" @change="handleTargetTypeChange">
            <el-radio value="all">Tất cả khách hàng</el-radio>
            <el-radio value="specific">Khách hàng cụ thể</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.targetType === 'specific'" label="Chọn user">
          <el-select
            v-model="form.user_id"
            filterable
            remote
            reserve-keyword
            placeholder="Nhập email hoặc ID user..."
            :remote-method="searchUsers"
            :loading="searchingUsers"
            style="width: 100%"
          >
            <el-option
              v-for="user in userOptions"
              :key="user.id"
              :label="user.email"
              :value="user.id"
            >
              <span style="float: left">{{ user.email }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">ID: {{ user.id }}</span>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- Reset đã dùng - chỉ hiển thị khi edit voucher hết hạn/hết lượt -->
        <el-form-item v-if="isEdit && showResetOption" label="Reset đã dùng">
          <div class="reset-option">
            <el-switch v-model="form.resetUsed" />
            <span class="reset-hint" :class="{ active: form.resetUsed }">
              {{ form.resetUsed ? '✓ Đặt số lượt đã dùng về 0' : 'Giữ nguyên số lượt đã dùng' }}
            </span>
          </div>
          <div class="current-used">Hiện tại: {{ editingVoucher?.used || 0 }} / {{ editingVoucher?.quantity || 0 }}</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">Hủy</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? 'Cập nhật' : 'Thêm' }}
        </el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/services/api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const allVouchers = ref([]) // Lưu tất cả voucher từ API
const vouchers = ref([]) // Voucher đã filter để hiển thị
const editingId = ref(null)
const editingVoucher = ref(null) // Lưu voucher đang edit
const statusFilter = ref('all')

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const form = reactive({
  title: '',
  description: '',
  type: 'DISCOUNTPERCENT',
  discount: 10,
  quantity: 100,
  dateRange: [],
  is_public: true,
  targetType: 'all',
  user_id: null,
  resetUsed: false
})

// Kiểm tra có hiển thị option reset không
const showResetOption = computed(() => {
  if (!editingVoucher.value) return false
  const statusCode = getVoucherStatusCode(editingVoucher.value)
  return statusCode === 'expired' || statusCode === 'used_up'
})

// User search
const searchingUsers = ref(false)
const userOptions = ref([])

const rules = {
  title: [{ required: true, message: 'Vui lòng nhập tiêu đề', trigger: 'blur' }],
  description: [{ required: true, message: 'Vui lòng nhập mô tả', trigger: 'blur' }],
  type: [{ required: true, message: 'Vui lòng chọn loại giảm giá', trigger: 'change' }],
  discount: [{ required: true, message: 'Vui lòng nhập giá trị giảm', trigger: 'blur' }],
  quantity: [{ required: true, message: 'Vui lòng nhập số lượng', trigger: 'blur' }],
  dateRange: [{ required: true, message: 'Vui lòng chọn thời gian', trigger: 'change' }]
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price || 0)
}

function getVoucherStatus(voucher) {
  const now = new Date()
  const start = new Date(voucher.start_at)
  const end = new Date(voucher.end_at)

  if (now < start) return 'Chưa bắt đầu'
  if (now > end) return 'Hết hạn'
  if (voucher.used >= voucher.quantity) return 'Đã hết'
  return 'Đang hoạt động'
}

function getVoucherStatusType(voucher) {
  const status = getVoucherStatus(voucher)
  switch (status) {
    case 'Đang hoạt động': return 'success'
    case 'Chưa bắt đầu': return 'info'
    case 'Hết hạn': return 'danger'
    case 'Đã hết': return 'warning'
    default: return 'info'
  }
}

function getVoucherTypeLabel(type) {
  switch (type) {
    case 'FREESHIP': return 'Miễn phí ship'
    case 'DISCOUNTPERCENT': return 'Giảm %'
    case 'DISCOUNTMONEY': return 'Giảm tiền'
    default: return type
  }
}

function getVoucherTypeColor(type) {
  switch (type) {
    case 'FREESHIP': return 'info'
    case 'DISCOUNTPERCENT': return 'warning'
    case 'DISCOUNTMONEY': return 'success'
    default: return 'info'
  }
}

function handleTargetTypeChange() {
  if (form.targetType === 'all') {
    form.user_id = null
  }
}

async function searchUsers(query) {
  if (!query || query.length < 2) {
    userOptions.value = []
    return
  }

  searchingUsers.value = true
  try {
    const response = await api.get('/auth/admin/users', {
      params: { search: query, limit: 10 }
    })
    if (response.data.success) {
      const data = response.data.data
      userOptions.value = Array.isArray(data) ? data : (data.users || [])
    }
  } catch (error) {
    userOptions.value = []
  } finally {
    searchingUsers.value = false
  }
}

function openDialog(voucher = null) {
  userOptions.value = []
  editingVoucher.value = voucher
  if (voucher) {
    isEdit.value = true
    editingId.value = voucher.id
    form.title = voucher.title
    form.description = voucher.description
    form.type = voucher.type
    form.discount = voucher.discount
    form.quantity = voucher.quantity
    form.dateRange = [voucher.start_at, voucher.end_at]
    form.is_public = voucher.is_public
    form.targetType = voucher.user_id ? 'specific' : 'all'
    form.user_id = voucher.user_id || null
    form.resetUsed = false
  } else {
    isEdit.value = false
    editingId.value = null
    form.title = ''
    form.description = ''
    form.type = 'DISCOUNTPERCENT'
    form.discount = 10
    form.quantity = 100
    form.dateRange = []
    form.is_public = true
    form.targetType = 'all'
    form.user_id = null
    form.resetUsed = false
  }
  dialogVisible.value = true
}

// Lấy status code từ voucher
function getVoucherStatusCode(voucher) {
  const now = new Date()
  const start = new Date(voucher.start_at)
  const end = new Date(voucher.end_at)

  if (now < start) return 'pending'
  if (now > end) return 'expired'
  if (voucher.used >= voucher.quantity) return 'used_up'
  return 'active'
}

// Áp dụng filter
function applyFilter() {
  if (statusFilter.value === 'all') {
    vouchers.value = allVouchers.value
  } else {
    vouchers.value = allVouchers.value.filter(v => getVoucherStatusCode(v) === statusFilter.value)
  }
  pagination.total = vouchers.value.length
}

async function fetchVouchers() {
  loading.value = true
  try {
    const response = await api.get('/admin/vouchers', {
      params: {
        page: pagination.page,
        limit: pagination.limit
      }
    })
    if (response.data.success) {
      const data = response.data.data
      // Hỗ trợ cả trường hợp API trả về mảng hoặc object có pagination
      if (Array.isArray(data)) {
        allVouchers.value = data
      } else {
        allVouchers.value = data.vouchers || data || []
      }
      applyFilter()
    }
  } catch (error) {
    ElMessage.error('Lỗi khi tải danh sách voucher')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true

    try {
      const data = {
        title: form.title,
        description: form.description,
        type: form.type,
        discount: form.discount,
        quantity: form.quantity,
        start_at: form.dateRange[0],
        end_at: form.dateRange[1],
        is_public: form.is_public,
        user_id: form.targetType === 'specific' ? form.user_id : null
      }

      // Nếu reset used được chọn, gửi used = 0
      if (isEdit.value && form.resetUsed) {
        data.used = 0
      }

      let response
      if (isEdit.value) {
        response = await api.put(`/voucher/${editingId.value}`, data)
      } else {
        response = await api.post('/vouchers', data)
      }

      if (response.data.success) {
        ElMessage.success(isEdit.value ? 'Cập nhật thành công' : 'Thêm voucher thành công')
        dialogVisible.value = false
        fetchVouchers()
      } else {
        ElMessage.error(response.data.message || 'Có lỗi xảy ra')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      submitting.value = false
    }
  })
}

onMounted(() => {
  fetchVouchers()
})
</script>

<style lang="scss" scoped>
.vouchers-page {
  .filter-section {
    margin-bottom: 20px;
  }

  .text-muted {
    font-size: 12px;
    color: #909399;
  }

  .action-buttons {
    display: flex;
    justify-content: center;
    align-items: center;

    .el-button {
      width: 32px;
      padding: 4px;
    }
  }

  .action-placeholder {
    display: inline-block;
    width: 32px;
  }

  .renew-info {
    background: #f5f7fa;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 20px;

    p {
      margin: 0 0 8px 0;
      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .reset-option {
    display: flex;
    align-items: center;
    background: #fdf6ec;
    border: 1px solid #e6a23c;
    border-radius: 6px;
    padding: 10px 14px;
    width: 100%;
  }

  .reset-hint {
    margin-left: 12px;
    font-size: 13px;
    font-weight: 500;
    color: #909399;
    transition: all 0.2s;

    &.active {
      color: #67c23a;
    }
  }

  .current-used {
    margin-top: 8px;
    font-size: 12px;
    color: #909399;
  }
}
</style>

<style lang="scss">
.voucher-dialog {
  .el-dialog__body {
    overflow: visible !important;
  }
}
</style>
