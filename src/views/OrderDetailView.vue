<template>
  <div class="order-detail-page">
    <div class="page-header">
      <h2>Chi tiết đơn hàng #{{ orderId }}</h2>
      <el-button @click="$router.back()">
        <el-icon><Back /></el-icon>
        Quay lại
      </el-button>
    </div>

    <div v-loading="loading">
      <el-row :gutter="20">
        <!-- Order Info -->
        <el-col :span="16">
          <el-card>
            <template #header>
              <span>Thông tin đơn hàng</span>
            </template>

            <el-descriptions :column="2" border>
              <el-descriptions-item label="Mã đơn">{{ orderData.id }}</el-descriptions-item>
              <el-descriptions-item label="Ngày đặt">{{ formatDate(orderData.order_date) }}</el-descriptions-item>
              <el-descriptions-item label="Người nhận">{{ deliveryInfo.name || 'N/A' }}</el-descriptions-item>
              <el-descriptions-item label="Số điện thoại">{{ deliveryInfo.phone || 'N/A' }}</el-descriptions-item>
              <el-descriptions-item label="Địa chỉ giao hàng" :span="2">{{ deliveryInfo.address || 'N/A' }}</el-descriptions-item>
              <el-descriptions-item label="Phương thức thanh toán">
                <el-tag :type="getPaymentType(orderData.payment_method)">
                  {{ getPaymentLabel(orderData.payment_method) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="Trạng thái hiện tại">
                <el-tag :type="getStatusType(currentStatus)">
                  {{ getStatusLabel(currentStatus) }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- Order Items -->
          <el-card style="margin-top: 20px">
            <template #header>
              <span>Sản phẩm đặt mua</span>
            </template>

            <el-table :data="paginatedItems" stripe>
              <el-table-column label="Sản phẩm" min-width="250">
                <template #default="{ row }">
                  <div class="product-cell">
                    <img :src="row.img_preview" class="product-img" />
                    <div>
                      <div>{{ row.name }}</div>
                      <div class="text-muted">
                        {{ row.color }} - Size {{ row.size }}
                      </div>
                    </div>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="Đơn giá" width="140">
                <template #default="{ row }">
                  {{ formatPrice(row.price) }}
                </template>
              </el-table-column>

              <el-table-column label="Số lượng" width="100">
                <template #default="{ row }">
                  {{ row.quantity }}
                </template>
              </el-table-column>

              <el-table-column label="Thành tiền" width="150">
                <template #default="{ row }">
                  {{ formatPrice(row.price * row.quantity) }}
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-wrapper" v-if="orderItems.length > itemsPageSize">
              <el-pagination
                v-model:current-page="itemsCurrentPage"
                :page-size="itemsPageSize"
                :total="orderItems.length"
                layout="prev, pager, next"
              />
            </div>

            <!-- Order Summary -->
            <div class="order-summary">
              <div class="summary-row">
                <span>Tạm tính:</span>
                <span>{{ formatPrice(orderData.total) }}</span>
              </div>
              <div class="summary-row" v-if="orderData.discount > 0">
                <span>Giảm giá:</span>
                <span class="discount">-{{ formatPrice(orderData.discount) }}</span>
              </div>
              <div class="summary-row">
                <span>Phí vận chuyển:</span>
                <span>{{ formatPrice(orderData.fee_ship || 0) }}</span>
              </div>
              <div class="summary-row total">
                <span>Tổng cộng:</span>
                <span>{{ formatPrice(orderData.real_total) }}</span>
              </div>
              <div class="summary-row payment-due">
                <span>Phải trả:</span>
                <span :class="{ 'paid': isPaid }">{{ formatPrice(amountDue) }}</span>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- Status Timeline & Actions -->
        <el-col :span="8">
          <!-- Update Status - Ẩn nếu đơn hàng đã giao hoặc đã hủy -->
          <el-card v-if="availableStatuses.length > 0">
            <template #header>
              <span>Cập nhật trạng thái</span>
            </template>

            <el-select v-model="newStatus" placeholder="Chọn trạng thái mới" style="width: 100%; margin-bottom: 15px">
              <el-option
                v-for="status in availableStatuses"
                :key="status.value"
                :label="status.label"
                :value="status.value"
              />
            </el-select>

            <el-button
              type="primary"
              :loading="updating"
              :disabled="!newStatus"
              @click="updateStatus"
              style="width: 100%"
            >
              Cập nhật trạng thái
            </el-button>
          </el-card>

          <!-- Status History -->
          <el-card :style="{ marginTop: availableStatuses.length > 0 ? '20px' : '0' }">
            <template #header>
              <span>Lịch sử trạng thái</span>
            </template>

            <el-timeline>
              <el-timeline-item
                v-for="status in statusHistory"
                :key="status.id"
                :timestamp="formatDate(status.updatedAt || status.createdAt)"
                :type="getStatusType(status.status)"
                placement="top"
              >
                <div class="status-item">
                  <strong>{{ getStatusLabel(status.status) }}</strong>
                  <p v-if="status.note" class="status-note">{{ status.note }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>

            <el-empty v-if="statusHistory.length === 0" description="Chưa có lịch sử" />
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const orderId = computed(() => route.params.id)

const loading = ref(false)
const updating = ref(false)
const order = ref({})
const orderItems = ref([])
const statusHistory = ref([])
const newStatus = ref('')

// Pagination cho danh sách sản phẩm
const itemsCurrentPage = ref(1)
const itemsPageSize = 5

const paginatedItems = computed(() => {
  const start = (itemsCurrentPage.value - 1) * itemsPageSize
  const end = start + itemsPageSize
  return orderItems.value.slice(start, end)
})

// Lấy thông tin đơn hàng từ response
const orderData = computed(() => order.value.order || {})

// Kiểm tra đã thanh toán chưa (HOME = chưa thanh toán, các phương thức khác = đã thanh toán)
const isPaid = computed(() => {
  const method = orderData.value.payment_method
  return method && method !== 'HOME'
})

// Số tiền phải trả: nếu đã thanh toán online thì = 0, còn lại = real_total
const amountDue = computed(() => {
  return isPaid.value ? 0 : (orderData.value.real_total || 0)
})

const statusLabels = {
  PENDING: 'Chờ xử lý',
  PACKING: 'Đang đóng gói',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy'
}

const statusTypes = {
  PENDING: 'warning',
  PACKING: 'primary',
  SHIPPING: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger'
}

const currentStatus = computed(() => {
  if (statusHistory.value.length === 0) return 'PENDING'
  return statusHistory.value[0]?.status || 'PENDING'
})

// Parse delivery_information: "Tên | SĐT | Địa chỉ"
const deliveryInfo = computed(() => {
  const info = orderData.value.delivery_information || ''
  const parts = info.split('|').map(p => p.trim())
  return {
    name: parts[0] || '',
    phone: parts[1] || '',
    address: parts[2] || ''
  }
})

// Trạng thái tiếp theo được phép chọn (theo thứ tự + hủy)
const availableStatuses = computed(() => {
  const status = currentStatus.value
  switch (status) {
    case 'PENDING':
      return [
        { value: 'PACKING', label: 'Đang đóng gói' },
        { value: 'CANCELLED', label: 'Đã hủy' }
      ]
    case 'PACKING':
      return [
        { value: 'SHIPPING', label: 'Đang giao' },
        { value: 'CANCELLED', label: 'Đã hủy' }
      ]
    case 'SHIPPING':
      return [
        { value: 'DELIVERED', label: 'Đã giao' },
        { value: 'CANCELLED', label: 'Đã hủy' }
      ]
    default:
      return [] // DELIVERED hoặc CANCELLED không thể thay đổi
  }
})

function getStatusLabel(status) {
  return statusLabels[status] || status
}

function getStatusType(status) {
  return statusTypes[status] || 'info'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price || 0)
}

function getPaymentType(method) {
  switch (method) {
    case 'HOME': return 'warning'
    case 'MOMO': return 'danger'
    case 'VNPAY': return 'primary'
    default: return 'info'
  }
}

function getPaymentLabel(method) {
  switch (method) {
    case 'HOME': return 'Thanh toán tại nhà'
    case 'MOMO': return 'Đã thanh toán (MoMo)'
    case 'VNPAY': return 'Đã thanh toán (VNPay)'
    default: return method || 'N/A'
  }
}

// Thứ tự hợp lệ của trạng thái
const statusOrder = ['PENDING', 'PACKING', 'SHIPPING', 'DELIVERED', 'CANCELLED']

async function fetchOrder() {
  loading.value = true
  try {
    const response = await api.get(`/admin/trackOrder/${orderId.value}`)
    if (response.data.success) {
      const data = response.data.data || {}
      order.value = data
      orderItems.value = data.order_items || []
      let statuses = data.order_status || []

      // Sort by date ascending (từ cũ đến mới) để xác định flow đúng
      statuses.sort((a, b) => new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt))

      // Lọc trùng và chỉ giữ các trạng thái hợp lệ theo thứ tự
      const seen = new Set()
      const validStatuses = []
      let maxStatusIndex = -1

      for (const s of statuses) {
        if (seen.has(s.status)) continue
        seen.add(s.status)

        const statusIndex = statusOrder.indexOf(s.status)
        // Nếu là CANCELLED thì luôn cho phép (có thể hủy ở bất kỳ bước nào)
        // Nếu không phải CANCELLED thì chỉ cho phép các trạng thái theo thứ tự
        if (s.status === 'CANCELLED' || statusIndex > maxStatusIndex) {
          validStatuses.push(s)
          if (s.status !== 'CANCELLED') {
            maxStatusIndex = statusIndex
          }
        }
      }

      // Đảo ngược để hiển thị mới nhất lên trên
      statusHistory.value = validStatuses.reverse()
    }
  } catch (error) {
    ElMessage.error('Lỗi khi tải thông tin đơn hàng')
  } finally {
    loading.value = false
  }
}

// Tạo ghi chú tự động theo trạng thái
function generateStatusNote(status) {
  const id = orderData.value.id
  switch (status) {
    case 'PENDING': return `Đơn hàng ${id} đang chờ xử lý`
    case 'PACKING': return `Đơn hàng ${id} đang được đóng gói`
    case 'SHIPPING': return `Đơn hàng ${id} đang được giao đến bạn`
    case 'DELIVERED': return `Đơn hàng ${id} đã giao thành công`
    case 'CANCELLED': return `Đơn hàng ${id} đã bị hủy`
    default: return `Đơn hàng ${id} đã được cập nhật`
  }
}

async function updateStatus() {
  if (!newStatus.value) return

  updating.value = true
  try {
    const response = await api.post('/orders/order_status', {
      order_id: orderId.value,
      status: newStatus.value,
      note: generateStatusNote(newStatus.value),
      user_id: orderData.value.user_id
    })

    if (response.data.success) {
      ElMessage.success('Cập nhật trạng thái thành công')
      newStatus.value = ''
      fetchOrder()
    } else {
      ElMessage.error(response.data.message || 'Cập nhật thất bại')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || 'Có lỗi xảy ra')
  } finally {
    updating.value = false
  }
}

onMounted(() => {
  fetchOrder()
})
</script>

<style lang="scss" scoped>
.order-detail-page {
  .product-cell {
    display: flex;
    align-items: center;
    gap: 12px;

    .product-img {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 8px;
    }

    .text-muted {
      font-size: 12px;
      color: #909399;
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 15px;
  }

  .order-summary {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #ebeef5;

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;

      &.total {
        font-size: 18px;
        font-weight: bold;
        color: #f56c6c;
        border-top: 1px solid #ebeef5;
        margin-top: 10px;
        padding-top: 15px;
      }

      &.payment-due {
        font-size: 20px;
        font-weight: bold;
        color: #e6a23c;
        margin-top: 10px;
        padding-top: 10px;

        .paid {
          color: #67c23a;
        }
      }

      .discount {
        color: #67c23a;
      }
    }
  }

  .status-item {
    .status-note {
      margin-top: 5px;
      font-size: 12px;
      color: #909399;
    }
  }
}
</style>
