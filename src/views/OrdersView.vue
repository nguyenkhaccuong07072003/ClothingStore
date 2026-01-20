<template>
  <div class="orders-page">
    <div class="page-header">
      <h2>Quản lý đơn hàng</h2>
      <div class="header-actions">
        <div class="search-box">
          <el-input
            v-model="searchQuery"
            placeholder="Tìm theo mã đơn hàng..."
            clearable
            style="width: 250px"
            @keyup.enter="handleSearch"
            @clear="handleClearSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" @click="handleSearch">Tìm kiếm</el-button>
        </div>
        <el-button
          type="success"
          :disabled="selectedOrders.length === 0"
          @click="handlePrintOrders"
        >
          <el-icon><Printer /></el-icon>
          In hóa đơn ({{ selectedOrders.length }})
        </el-button>
      </div>
    </div>

    <!-- Status Tabs -->
    <el-tabs v-model="activeStatus" @tab-change="fetchOrders">
      <el-tab-pane label="Tất cả" name="ALL" />
      <el-tab-pane label="Chờ xử lý" name="PENDING" />
      <el-tab-pane label="Đang đóng gói" name="PACKING" />
      <el-tab-pane label="Đang giao" name="SHIPPING" />
      <el-tab-pane label="Đã giao" name="DELIVERED" />
      <el-tab-pane label="Đã hủy" name="CANCELLED" />
    </el-tabs>

    <div class="data-table">
      <el-table
        :data="orders"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="Mã đơn" width="140" />

        <el-table-column label="Khách hàng" min-width="200">
          <template #default="{ row }">
            <div>{{ row.user_full_name || 'N/A' }}</div>
            <div class="text-muted">{{ row.user_email }}</div>
          </template>
        </el-table-column>

        <el-table-column label="Ngày đặt" min-width="150">
          <template #default="{ row }">
            {{ formatDate(row.order_date) }}
          </template>
        </el-table-column>

        <el-table-column label="Tổng tiền" min-width="130">
          <template #default="{ row }">
            <div>{{ formatPrice(row.real_total) }}</div>
            <div v-if="row.discount > 0" class="text-muted discount">
              -{{ formatPrice(row.discount) }}
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Thanh toán" min-width="140">
          <template #default="{ row }">
            <el-tag size="small" :type="getPaymentType(row.payment_method)">
              {{ getPaymentLabel(row.payment_method) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Trạng thái" min-width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="getStatusType(row.currentStatus)">
              {{ getStatusLabel(row.currentStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/orders/${row.id}`)">
              <el-icon><View /></el-icon>
              Chi tiết
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
          @size-change="fetchOrders"
          @current-change="fetchOrders"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import { ElMessage } from 'element-plus'
import { Search, Printer } from '@element-plus/icons-vue'

const router = useRouter()
const loading = ref(false)
const orders = ref([])
const activeStatus = ref('ALL')
const searchQuery = ref('')
const selectedOrders = ref([])

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

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
    case 'MOMO': return 'Đã thanh toán'
    case 'VNPAY': return 'Đã thanh toán'
    default: return method || 'N/A'
  }
}

function getStatusType(status) {
  switch (status) {
    case 'PENDING': return 'warning'
    case 'PACKING': return 'primary'
    case 'SHIPPING': return ''
    case 'DELIVERED': return 'success'
    case 'CANCELLED': return 'danger'
    default: return 'info'
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'PENDING': return 'Chờ xử lý'
    case 'PACKING': return 'Đang đóng gói'
    case 'SHIPPING': return 'Đang giao'
    case 'DELIVERED': return 'Đã giao'
    case 'CANCELLED': return 'Đã hủy'
    default: return status || 'N/A'
  }
}

async function fetchOrders() {
  loading.value = true
  try {
    const status = activeStatus.value === 'ALL' ? 'ALL' : activeStatus.value
    const response = await api.get(`/admin/orders/${status}`, {
      params: {
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery.value || undefined
      }
    })

    if (response.data.success) {
      orders.value = response.data.data.orders || response.data.data || []
      pagination.total = response.data.data.pagination?.totalItems || response.data.data.total || orders.value.length
    }
  } catch (error) {
    ElMessage.error('Lỗi khi tải danh sách đơn hàng')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchOrders()
}

function handleClearSearch() {
  searchQuery.value = ''
  pagination.page = 1
  fetchOrders()
}

function handleSelectionChange(selection) {
  selectedOrders.value = selection
}

function handlePrintOrders() {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('Vui lòng chọn ít nhất một đơn hàng')
    return
  }
  const ids = selectedOrders.value.map(order => order.id).join(',')
  router.push({ path: '/orders-print', query: { ids } })
}

onMounted(() => {
  fetchOrders()
})
</script>

<style lang="scss" scoped>
.orders-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 10px;

    h2 {
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 15px;
      flex-wrap: wrap;

      .search-box {
        display: flex;
        gap: 10px;
      }
    }
  }

  .text-muted {
    font-size: 12px;
    color: #909399;
  }

  .discount {
    color: #f56c6c;
  }
}

// Mobile responsive
@media screen and (max-width: 768px) {
  .orders-page {
    .page-header {
      flex-direction: column;
      align-items: flex-start;

      h2 {
        font-size: 18px;
      }

      .header-actions {
        width: 100%;

        .search-box {
          flex: 1;

          .el-input {
            width: 100% !important;
          }
        }
      }
    }

    :deep(.el-tabs__nav-scroll) {
      overflow-x: auto;
    }

    :deep(.el-tabs__nav) {
      flex-wrap: nowrap;
    }

    .data-table {
      :deep(.el-table) {
        font-size: 12px;
      }

      :deep(.el-pagination) {
        flex-wrap: wrap;
        justify-content: center;

        .el-pagination__sizes {
          display: none;
        }
      }
    }
  }
}
</style>
