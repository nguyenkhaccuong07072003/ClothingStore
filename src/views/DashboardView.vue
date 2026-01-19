<template>
  <div class="dashboard">
    <div class="page-header">
      <h2>Dashboard</h2>
    </div>

    <!-- Stats Cards -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ stats.pending }}</div>
        <div class="stat-label">Chờ xử lý</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">{{ stats.packing }}</div>
        <div class="stat-label">Đang đóng gói</div>
      </div>
      <div class="stat-card info">
        <div class="stat-value">{{ stats.shipping }}</div>
        <div class="stat-label">Đang giao</div>
      </div>
      <div class="stat-card primary">
        <div class="stat-value">{{ stats.delivered }}</div>
        <div class="stat-label">Đã giao</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">{{ stats.canceled }}</div>
        <div class="stat-label">Đã hủy</div>
      </div>
    </div>

    <el-row :gutter="20" style="margin-top: 20px">
      <!-- Revenue Chart -->
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="chart-header">
              <span>{{ chartTitle }}</span>
              <div class="chart-filters">
                <el-select
                  v-model="selectedPeriod"
                  placeholder="Chọn khoảng thời gian"
                  style="width: 150px"
                  @change="handlePeriodChange"
                >
                  <el-option
                    v-for="period in periodOptions"
                    :key="period.value"
                    :label="period.label"
                    :value="period.value"
                  />
                </el-select>
                <el-select
                  v-if="selectedPeriod === 'year'"
                  v-model="selectedYear"
                  placeholder="Chọn năm"
                  style="width: 100px"
                  @change="handleYearChange"
                >
                  <el-option
                    v-for="year in availableYears"
                    :key="year"
                    :label="year"
                    :value="year"
                  />
                </el-select>
                <el-date-picker
                  v-if="selectedPeriod === 'custom'"
                  v-model="dateRange"
                  type="daterange"
                  range-separator="-"
                  start-placeholder="Từ ngày"
                  end-placeholder="Đến ngày"
                  format="DD/MM/YYYY"
                  value-format="YYYY-MM-DD"
                  style="width: 260px"
                  @change="handleDateRangeChange"
                />
              </div>
            </div>
          </template>
          <div class="chart-container">
            <Bar v-if="chartData" :data="chartData" :options="chartOptions" :key="chartKey" />
            <el-empty v-else description="Không có dữ liệu" />
          </div>
        </el-card>
      </el-col>

      <!-- Top Products -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>Top 3 sản phẩm bán chạy</span>
          </template>
          <div class="top-products">
            <div
              v-for="(product, index) in topProducts"
              :key="product.id"
              class="product-item"
            >
              <div class="rank">{{ index + 1 }}</div>
              <img :src="getImageUrl(product.imgPreview)" :alt="product.name" class="product-img" />
              <div class="product-info">
                <div class="product-name">{{ product.name }}</div>
                <div class="product-sold">Đã bán: {{ product.sold }}</div>
              </div>
            </div>
            <el-empty v-if="topProducts.length === 0" description="Không có dữ liệu" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import api from '@/services/api'
import { ElMessage } from 'element-plus'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const stats = ref({
  pending: 0,
  packing: 0,
  shipping: 0,
  delivered: 0,
  canceled: 0
})

const topProducts = ref([])
const chartData = ref(null)
const chartKey = ref(0)

// Filter states
const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const selectedPeriod = ref('year')
const dateRange = ref(null)

// Period options
const periodOptions = [
  { label: 'Cả năm', value: 'year' },
  { label: '1 tháng gần đây', value: '1month' },
  { label: '3 tháng gần đây', value: '3months' },
  { label: '6 tháng gần đây', value: '6months' },
  { label: 'Tùy chọn', value: 'custom' }
]

// Generate available years (5 years back from current year)
const availableYears = computed(() => {
  const years = []
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i)
  }
  return years
})

// Dynamic chart title
const chartTitle = computed(() => {
  if (selectedPeriod.value === 'custom' && dateRange.value && dateRange.value.length === 2) {
    return `Doanh thu từ ${formatDate(dateRange.value[0])} đến ${formatDate(dateRange.value[1])}`
  }
  if (selectedPeriod.value === '1month') {
    return 'Doanh thu 1 tháng gần đây'
  }
  if (selectedPeriod.value === '3months') {
    return 'Doanh thu 3 tháng gần đây'
  }
  if (selectedPeriod.value === '6months') {
    return 'Doanh thu 6 tháng gần đây'
  }
  return `Doanh thu theo năm (${selectedYear.value})`
})

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN')
}

function getImageUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `http://localhost:3333${url.startsWith('/') ? '' : '/'}${url}`
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => {
          return new Intl.NumberFormat('vi-VN').format(value) + 'đ'
        }
      }
    }
  }
}

async function fetchStats() {
  try {
    const response = await api.get('/admin/orders/statistical')
    if (response.data.success) {
      const rawData = response.data.data || []
      // Convert array to object
      const dataMap = {}
      rawData.forEach(item => {
        dataMap[item.status] = item.order_count
      })
      stats.value = {
        pending: dataMap['PENDING'] || 0,
        packing: dataMap['PACKING'] || 0,
        shipping: dataMap['SHIPPING'] || 0,
        delivered: dataMap['DELIVERED'] || 0,
        canceled: dataMap['CANCELED'] || 0
      }
    }
  } catch (error) {
    ElMessage.error('Lỗi khi tải thống kê đơn hàng')
  }
}

async function fetchRevenueStats(year = null, startDate = null, endDate = null) {
  try {
    const params = {}
    if (startDate && endDate) {
      params.start_date = startDate
      params.end_date = endDate
    } else {
      params.year = year || selectedYear.value
    }

    const response = await api.get('/admin/statistical/sale', { params })
    if (response.data.success) {
      const result = response.data.data

      if (result.type === 'daily') {
        // Dữ liệu theo ngày
        const labels = result.data.map(item => {
          const date = new Date(item.date)
          return `${date.getDate()}/${date.getMonth() + 1}`
        })
        const revenues = result.data.map(item => item.revenue)

        chartData.value = {
          labels,
          datasets: [
            {
              label: 'Doanh thu',
              data: revenues,
              backgroundColor: 'rgba(102, 126, 234, 0.8)',
              borderColor: 'rgba(102, 126, 234, 1)',
              borderWidth: 1
            }
          ]
        }
      } else {
        // Dữ liệu theo tháng
        const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
        const data = result.data || []

        const revenues = new Array(12).fill(0)
        data.forEach(item => {
          revenues[item.month - 1] = item.revenue || 0
        })

        chartData.value = {
          labels: months,
          datasets: [
            {
              label: 'Doanh thu',
              data: revenues,
              backgroundColor: 'rgba(102, 126, 234, 0.8)',
              borderColor: 'rgba(102, 126, 234, 1)',
              borderWidth: 1
            }
          ]
        }
      }

      // Force chart re-render
      chartKey.value++
    }
  } catch (error) {
    console.error('Error fetching revenue:', error)
    ElMessage.error('Lỗi khi tải thống kê doanh thu')
  }
}

function handlePeriodChange(period) {
  dateRange.value = null

  if (period === 'year') {
    fetchRevenueStats(selectedYear.value)
  } else if (period === '1month') {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)
    fetchRevenueStats(null, formatDateParam(startDate), formatDateParam(endDate))
  } else if (period === '3months') {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 3)
    fetchRevenueStats(null, formatDateParam(startDate), formatDateParam(endDate))
  } else if (period === '6months') {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 6)
    fetchRevenueStats(null, formatDateParam(startDate), formatDateParam(endDate))
  }
  // 'custom' sẽ chờ user chọn ngày
}

function formatDateParam(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function handleYearChange(year) {
  fetchRevenueStats(year)
}

function handleDateRangeChange(range) {
  if (range && range.length === 2) {
    fetchRevenueStats(null, range[0], range[1])
  }
}

async function fetchTopProducts() {
  try {
    const response = await api.get('/admin/statistical/top_products')
    if (response.data.success) {
      topProducts.value = response.data.data || []
    }
  } catch (error) {
    ElMessage.error('Lỗi khi tải top sản phẩm')
  }
}

onMounted(() => {
  fetchStats()
  fetchRevenueStats()
  fetchTopProducts()
})
</script>

<style lang="scss" scoped>
.dashboard {
  .stats-row {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;

    .stat-card {
      flex: 1;
    }
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .chart-filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .chart-container {
    height: 350px;
  }

  .top-products {
    .product-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #ebeef5;

      &:last-child {
        border-bottom: none;
      }

      .rank {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        margin-right: 12px;
      }

      .product-img {
        width: 50px;
        height: 50px;
        object-fit: cover;
        border-radius: 8px;
        margin-right: 12px;
      }

      .product-info {
        flex: 1;

        .product-name {
          font-weight: 500;
          color: #303133;
          margin-bottom: 4px;
        }

        .product-sold {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }
}
</style>