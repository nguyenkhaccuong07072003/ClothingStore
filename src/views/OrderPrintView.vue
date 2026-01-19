<template>
  <div class="print-page">
    <!-- Nút in (ẩn khi in) -->
    <div class="print-actions no-print">
      <el-button type="primary" @click="handlePrint">
        <el-icon><Printer /></el-icon>
        In hóa đơn
      </el-button>
      <el-button type="success" @click="handleExportPDF" :loading="exporting">
        <el-icon><Download /></el-icon>
        Xuất PDF
      </el-button>
      <el-button @click="$router.back()">
        <el-icon><Back /></el-icon>
        Quay lại
      </el-button>
    </div>

    <div v-loading="loading" class="invoices-container">
      <div v-if="orders.length === 0 && !loading" class="no-orders">
        <el-empty description="Không có đơn hàng nào để in" />
      </div>

      <!-- Mỗi đơn hàng = 1 trang in -->
      <div
        v-for="(order, index) in orders"
        :key="order.id"
        class="invoice"
        :class="{ 'page-break': index < orders.length - 1 }"
      >
        <div class="invoice-header">
          <h2>HÓA ĐƠN BÁN HÀNG</h2>
          <p class="shop-name">CLOTHING STORE</p>
        </div>

        <div class="invoice-info">
          <div class="info-row">
            <span class="label">Mã đơn hàng:</span>
            <span class="value order-id">{{ order.id }}</span>
          </div>
          <div class="info-row">
            <span class="label">Ngày đặt:</span>
            <span class="value">{{ formatDate(order.order_date) }}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="customer-info">
          <h3>Thông tin người nhận</h3>
          <div class="info-row">
            <span class="label">Họ tên:</span>
            <span class="value">{{ parseDeliveryInfo(order.delivery_information).name }}</span>
          </div>
          <div class="info-row">
            <span class="label">Số điện thoại:</span>
            <span class="value">{{ parseDeliveryInfo(order.delivery_information).phone }}</span>
          </div>
          <div class="info-row">
            <span class="label">Địa chỉ:</span>
            <span class="value address">{{ parseDeliveryInfo(order.delivery_information).address }}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="payment-info">
          <div class="info-row">
            <span class="label">Tạm tính:</span>
            <span class="value">{{ formatPrice(order.total) }}</span>
          </div>
          <div class="info-row" v-if="order.discount > 0">
            <span class="label">Giảm giá:</span>
            <span class="value discount">-{{ formatPrice(order.discount) }}</span>
          </div>
          <div class="info-row" v-if="order.fee_ship > 0">
            <span class="label">Phí vận chuyển:</span>
            <span class="value">{{ formatPrice(order.fee_ship) }}</span>
          </div>
          <div class="info-row total">
            <span class="label">TỔNG TIỀN:</span>
            <span class="value">{{ formatPrice(order.real_total) }}</span>
          </div>
          <div class="info-row payment-due">
            <span class="label">SỐ TIỀN PHẢI TRẢ:</span>
            <span class="value" :class="{ paid: isPaid(order) }">
              {{ isPaid(order) ? 'ĐÃ THANH TOÁN' : formatPrice(order.real_total) }}
            </span>
          </div>
        </div>

        <div class="invoice-footer">
          <p>Cảm ơn quý khách đã mua hàng!</p>
          <p class="date-print">Ngày in: {{ getCurrentDate() }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import { ElMessage } from 'element-plus'
import { Printer, Back, Download } from '@element-plus/icons-vue'
import html2pdf from 'html2pdf.js'

const route = useRoute()
const loading = ref(false)
const exporting = ref(false)
const orders = ref([])

function parseDeliveryInfo(info) {
  if (!info) return { name: '', phone: '', address: '' }
  const parts = info.split('|').map(p => p.trim())
  return {
    name: parts[0] || '',
    phone: parts[1] || '',
    address: parts[2] || ''
  }
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

function isPaid(order) {
  return order.payment_method && order.payment_method !== 'HOME'
}

function getCurrentDate() {
  return new Date().toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function handlePrint() {
  window.print()
}

function formatDateForFilename() {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${day}-${month}-${year}_${hours}-${minutes}`
}

async function handleExportPDF() {
  if (orders.value.length === 0) {
    ElMessage.warning('Không có đơn hàng nào để xuất')
    return
  }

  exporting.value = true

  try {
    const container = document.querySelector('.invoices-container')

    const opt = {
      margin: [5, 8, 5, 8], // top, right, bottom, left - tăng margin trái phải
      filename: `bill_${formatDateForFilename()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: {
        unit: 'mm',
        format: [90, 200], // Tăng width để có thêm margin
        orientation: 'portrait'
      },
      pagebreak: { mode: ['css', 'legacy'], before: '.page-break' }
    }

    await html2pdf().set(opt).from(container).save()
    ElMessage.success('Xuất PDF thành công')
  } catch (error) {
    console.error('Export PDF error:', error)
    ElMessage.error('Lỗi khi xuất PDF')
  } finally {
    exporting.value = false
  }
}

async function fetchOrders() {
  const ids = route.query.ids
  if (!ids) {
    ElMessage.warning('Không có đơn hàng nào được chọn')
    return
  }

  const orderIds = ids.split(',')
  loading.value = true

  try {
    // Fetch từng đơn hàng
    const promises = orderIds.map(id =>
      api.get(`/admin/trackOrder/${id}`)
    )
    const responses = await Promise.all(promises)

    orders.value = responses
      .filter(res => res.data.success && res.data.data?.order)
      .map(res => res.data.data.order)

    if (orders.value.length === 0) {
      ElMessage.warning('Không tìm thấy đơn hàng nào')
    }
  } catch (error) {
    ElMessage.error('Lỗi khi tải thông tin đơn hàng')
    console.error(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<style lang="scss" scoped>
.print-page {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.print-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  justify-content: center;
}

.invoices-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
}

.no-orders {
  padding: 50px;
  background: white;
  border-radius: 8px;
}

.invoice {
  width: 80mm; /* Khổ giấy hóa đơn tiêu chuẩn */
  background: white;
  padding: 15px;
  border: 1px solid #ddd;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.invoice-header {
  text-align: center;
  margin-bottom: 15px;

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: bold;
  }

  .shop-name {
    margin: 5px 0 0;
    font-size: 14px;
    color: #666;
  }
}

.divider {
  border-top: 1px dashed #ccc;
  margin: 10px 0;
}

.invoice-info,
.customer-info,
.payment-info {
  margin-bottom: 10px;

  h3 {
    font-size: 13px;
    margin: 0 0 8px 0;
    font-weight: bold;
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  line-height: 1.4;

  .label {
    color: #666;
    flex-shrink: 0;
  }

  .value {
    text-align: right;
    word-break: break-word;

    &.order-id {
      font-weight: bold;
      font-size: 14px;
    }

    &.address {
      max-width: 60%;
    }

    &.discount {
      color: #67c23a;
    }

    &.paid {
      color: #67c23a;
      font-weight: bold;
    }
  }

  &.total {
    font-size: 14px;
    font-weight: bold;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid #eee;
  }

  &.payment-due {
    font-size: 14px;
    font-weight: bold;
    color: #e6a23c;
    margin-top: 5px;
  }
}

.invoice-footer {
  text-align: center;
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px dashed #ccc;

  p {
    margin: 5px 0;
    font-size: 11px;
  }

  .date-print {
    color: #999;
  }
}

/* Page break giữa các hóa đơn khi in */
.page-break {
  page-break-after: always;
}

/* Ẩn các phần tử không cần in */
@media print {
  .no-print {
    display: none !important;
  }

  .print-page {
    padding: 0;
    background: white;
  }

  .invoices-container {
    gap: 0;
  }

  .invoice {
    box-shadow: none;
    border: none;
    width: 100%;
    max-width: 80mm;
    margin: 0 auto;
  }

  @page {
    size: 80mm auto;
    margin: 5mm;
  }
}
</style>